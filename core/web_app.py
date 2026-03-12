from __future__ import annotations

import asyncio
import html
import hmac
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from aiohttp import web

from core.auth import SessionCodec, is_valid_email, sanitize_email, validate_password
from core.master_orchestrator import MasterOrchestrator
from core.runtime_router import RuntimeRouter
from core.settings import AppSettings, env_value
from core.session_store import SessionStore
from core.user_store import UserStore
from core.api_key_store import ApiKeyStore
from core.email_service import EmailService
from core.feedback_store import FeedbackStore
from core.memo_generator import generate_memo
from core.drift_monitor import build_drift_analysis
from core.claim_ledger import build_claim_ledger
from core.claim_store import ClaimStore
from core.workspace_store import WorkspaceStore
from core.watchlist_store import WatchlistStore
from learning.atropos_runner import get_training_status
from learning.preference_extractor import build_dpo_dataset
from learning.trajectory_stats import build_stats


class InMemoryRateLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._buckets: dict[str, list[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, key: str) -> tuple[bool, int]:
        now = asyncio.get_running_loop().time()
        async with self._lock:
            bucket = self._buckets.get(key, [])
            window_start = now - self.window_seconds
            bucket = [timestamp for timestamp in bucket if timestamp > window_start]
            allowed = len(bucket) < self.limit
            if allowed:
                bucket.append(now)
            self._buckets[key] = bucket
            if allowed:
                return True, 0
            retry_after = max(1, int(bucket[0] + self.window_seconds - now))
            return False, retry_after


class HermesWebApp:
    def __init__(self, settings: AppSettings, orchestrator: MasterOrchestrator) -> None:
        self.settings = settings
        self.orchestrator = orchestrator
        self.root = Path(orchestrator.root)
        self.runtime = RuntimeRouter(settings, orchestrator)
        self.session_store = SessionStore(self.root)
        self.user_store = UserStore(self.root)
        self.access_token = env_value(settings.web.token_env)
        auth_secret = env_value(settings.web.auth_secret_env)
        self.session_codec = SessionCodec(auth_secret, ttl_days=settings.web.session_ttl_days) if auth_secret else None
        self.rate_limiter = InMemoryRateLimiter(
            limit=settings.web.rate_limit_requests,
            window_seconds=settings.web.rate_limit_window_seconds,
        )
        self.auth_rate_limiter = InMemoryRateLimiter(limit=8, window_seconds=15 * 60)
        self.api_key_store = ApiKeyStore(self.root)
        self.email_service = EmailService()
        self.api_key_rate_limiter = InMemoryRateLimiter(limit=30, window_seconds=60)
        self.guest_rate_limiter = InMemoryRateLimiter(limit=5, window_seconds=60)
        self.feedback_store = FeedbackStore(str(self.root))

    def build_app(self) -> web.Application:
        app = web.Application(client_max_size=2 * 1024 * 1024, middlewares=[self._security_headers_middleware])
        app.add_routes(
            [
                web.get('/', self.handle_index),
                web.get('/share/{share_id}', self.handle_share_page),
                web.get('/api/health', self.handle_health),
                web.get('/api/meta', self.handle_meta),
                web.get('/api/me', self.handle_me),
                web.get('/api/share/{share_id}', self.handle_public_share),
                web.post('/api/register', self.handle_register),
                web.post('/api/login', self.handle_login),
                web.post('/api/logout', self.handle_logout),
                web.get('/api/stats', self.handle_stats),
                web.get('/api/sessions', self.handle_sessions),
                web.get('/api/sessions/{session_id}', self.handle_session),
                web.get('/api/sessions/{session_id}/export', self.handle_session_export),
                web.post('/api/sessions/{session_id}/share', self.handle_create_share),
                web.delete('/api/sessions/{session_id}/share', self.handle_revoke_share),
                web.get('/api/report/benchmark', self.handle_benchmark_report),
                web.get('/api/loop/status', self.handle_loop_status),
                web.post('/api/query', self.handle_query),
                web.post('/api/query/stream', self.handle_query_stream),
                web.post('/api/query/solo', self.handle_solo_query),
                web.get('/api/verify-email', self.handle_verify_email),
                web.post('/api/forgot-password', self.handle_forgot_password),
                web.post('/api/reset-password', self.handle_reset_password),
                web.post('/api/keys', self.handle_create_api_key),
                web.get('/api/keys', self.handle_list_api_keys),
                web.delete('/api/keys/{key_id}', self.handle_revoke_api_key),
                web.get('/api/compare/benchmark', self.handle_compare_benchmark),
                web.get('/api/benchmark/council-vs-solo', self.handle_council_vs_solo_benchmark),
                web.get('/api/export/dpo', self.handle_export_dpo),
                web.get('/api/skills', self.handle_skills_list),
                web.get('/api/research/analysis', self.handle_research_analysis),
                web.post('/api/sessions/{session_id}/feedback', self.handle_session_feedback),
                web.post('/api/sessions/{session_id}/outcome', self.handle_session_outcome),
                web.post('/api/sessions/{session_id}/claim-feedback', self.handle_claim_feedback),
                web.post('/api/sessions/{session_id}/note', self.handle_session_note),
                web.get('/api/feedback/stats', self.handle_feedback_stats),
                web.get('/api/sessions/{session_id}/drift', self.handle_session_drift),
                web.get('/api/claims/ledger', self.handle_claim_ledger),
                web.get('/api/claims/store', self.handle_claim_store_stats),
                web.get('/api/claims/search', self.handle_claim_search),
                web.get('/api/claims/recurring', self.handle_recurring_claims),
                web.get('/api/claims/{claim_id}', self.handle_claim_detail),
                # Workspace routes
                web.post('/api/workspaces', self.handle_create_workspace),
                web.get('/api/workspaces', self.handle_list_workspaces),
                web.get('/api/workspaces/{workspace_id}', self.handle_get_workspace),
                web.patch('/api/workspaces/{workspace_id}', self.handle_update_workspace),
                web.delete('/api/workspaces/{workspace_id}', self.handle_delete_workspace),
                web.post('/api/workspaces/{workspace_id}/sessions', self.handle_workspace_add_session),
                web.delete('/api/workspaces/{workspace_id}/sessions/{session_id}', self.handle_workspace_remove_session),
                web.post('/api/workspaces/{workspace_id}/claims', self.handle_workspace_pin_claim),
                web.delete('/api/workspaces/{workspace_id}/claims/{claim_id}', self.handle_workspace_unpin_claim),
                web.post('/api/workspaces/{workspace_id}/evidence', self.handle_workspace_pin_evidence),
                web.delete('/api/workspaces/{workspace_id}/evidence', self.handle_workspace_unpin_evidence),
                web.post('/api/workspaces/{workspace_id}/notes', self.handle_workspace_add_note),
                web.delete('/api/workspaces/{workspace_id}/notes/{note_id}', self.handle_workspace_delete_note),
                # Watchlist routes
                web.post('/api/watchlist/watch', self.handle_watchlist_watch),
                web.post('/api/watchlist/unwatch', self.handle_watchlist_unwatch),
                web.get('/api/watchlist', self.handle_watchlist_list),
                web.post('/api/watchlist/refresh', self.handle_watchlist_refresh),
                web.get('/api/watchlist/stats', self.handle_watchlist_stats),
                web.get('/api/watchlist/{claim_id}', self.handle_watchlist_detail),
            ]
        )
        # SPA routes — serve React index.html for /app and /app/*
        app.router.add_get('/app', self.handle_index)
        app.router.add_get('/app/{rest:.*}', self.handle_index)
        app.router.add_get('/verdict/{rest:.*}', self.handle_index)
        app.router.add_get('/paper', self.handle_index)
        # Serve built React assets
        dist_dir = self.root / 'web' / 'dist'
        if dist_dir.is_dir():
            app.router.add_static('/assets/', dist_dir / 'assets')
        return app

    async def handle_index(self, request: web.Request) -> web.StreamResponse:
        dist_index = self.root / 'web' / 'dist' / 'index.html'
        if dist_index.is_file():
            return web.FileResponse(dist_index)
        return web.FileResponse(self.root / 'web' / 'index.html')

    async def handle_share_page(self, request: web.Request) -> web.Response:
        session = self.session_store.get_shared_session(request.match_info['share_id'])
        if session is None:
            raise web.HTTPNotFound(text='Shared session not found.')
        return web.Response(
            text=self._render_share_html(session, request),
            content_type='text/html',
        )

    async def handle_health(self, request: web.Request) -> web.Response:
        return web.json_response({'status': 'ok'})

    async def handle_meta(self, request: web.Request) -> web.Response:
        principal = self._resolve_principal(request)
        sessions = self.session_store.get_recent_sessions(n=25)
        return web.json_response(
            {
                'provider_name': 'NousResearch' if 'nousresearch' in (self.settings.provider.base_url or '').lower() else self.settings.provider.name,
                'model': self.settings.provider.model,
                'base_url': self.settings.provider.base_url,
                'telegram_enabled': self.settings.telegram.enabled,
                'recent_session_count': len(sessions),
                'admin_token_enabled': bool(self.access_token),
                'user_auth_enabled': self.session_codec is not None,
                'public_base_url': self.settings.web.public_base_url,
                'share_links_ready': bool((self.settings.web.public_base_url or '').strip()),
                'rate_limit_requests': self.settings.web.rate_limit_requests,
                'rate_limit_window_seconds': self.settings.web.rate_limit_window_seconds,
                'current_user': principal.get('user') if principal and principal.get('kind') == 'user' else None,
                'current_role': principal.get('kind') if principal else None,
                'csrf_token': self._csrf_token_for_principal(principal),
            }
        )

    async def handle_me(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        return web.json_response(
            {
                'kind': principal['kind'],
                'user': principal.get('user'),
                'csrf_token': self._csrf_token_for_principal(principal),
            }
        )

    async def handle_register(self, request: web.Request) -> web.Response:
        if self.session_codec is None:
            raise web.HTTPServiceUnavailable(text='User auth is disabled because no auth secret is configured.')
        self._require_same_origin(request)
        payload = await self._read_json(request)
        email = str(payload.get('email') or '')
        password = str(payload.get('password') or '')
        await self._enforce_auth_rate_limit(request, email)
        if not is_valid_email(email):
            raise web.HTTPBadRequest(text='Provide a valid email address.')
        password_error = validate_password(password)
        if password_error:
            raise web.HTTPBadRequest(text=password_error)
        try:
            user = self.user_store.create_user(email=email, password=password)
        except ValueError as exc:
            raise web.HTTPConflict(text=str(exc)) from exc
        verification_token = user.pop('verification_token', None)
        if self.email_service.enabled and verification_token:
            self.email_service.send_verification_email(email, verification_token)
            return web.json_response({
                'user': user,
                'message': 'Check your email to verify your account.',
                'verification_required': True,
            }, status=201)
        response = web.json_response({'user': user})
        self._set_user_cookie(request, response, user['user_id'])
        return response

    async def handle_login(self, request: web.Request) -> web.Response:
        if self.session_codec is None:
            raise web.HTTPServiceUnavailable(text='User auth is disabled because no auth secret is configured.')
        self._require_same_origin(request)
        payload = await self._read_json(request)
        email = str(payload.get('email') or '')
        password = str(payload.get('password') or '')
        await self._enforce_auth_rate_limit(request, email)
        user = self.user_store.authenticate(email=email, password=password)
        if user is None:
            raise web.HTTPUnauthorized(text='Invalid email or password.')
        if self.email_service.enabled and not user.get('verified', True):
            raise web.HTTPForbidden(text='Please verify your email before logging in.')
        response = web.json_response({'user': user})
        self._set_user_cookie(request, response, user['user_id'])
        return response

    async def handle_logout(self, request: web.Request) -> web.Response:
        self._require_same_origin(request)
        principal = self._resolve_principal(request)
        self._require_csrf_token(request, principal)
        response = web.json_response({'ok': True})
        response.del_cookie(
            self.settings.web.session_cookie_name,
            path='/',
            secure=self._cookie_should_be_secure(request),
            httponly=True,
            samesite='Strict',
        )
        return response

    async def handle_stats(self, request: web.Request) -> web.Response:
        self._require_principal(request)
        sessions = self.session_store.get_recent_sessions(n=1000)
        last_ten = self.session_store.get_recent_sessions(n=10)
        trajectory_stats = build_stats(self.root)
        training_status = get_training_status(self.root)
        benchmark_summary = self._load_benchmark_summary()
        feedback_stats = self.feedback_store.get_stats()
        return web.json_response(
            {
                'total_sessions': len(sessions),
                'average_confidence_all_time': self._average_confidence(sessions),
                'average_confidence_last_10': self._average_confidence(last_ten),
                'skills_created': len(list((self.root / 'skills').glob('auto_*.md'))),
                'trajectory': trajectory_stats,
                'training': training_status,
                'benchmark': benchmark_summary,
                'feedback': feedback_stats,
            }
        )

    async def handle_sessions(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        limit_raw = request.query.get('limit', '12')
        try:
            limit = max(1, min(int(limit_raw), 100))
        except ValueError:
            limit = 12
        query_text = request.query.get('q', '').strip()
        backend_filter = request.query.get('backend', '').strip().lower()
        conflict_filter = request.query.get('conflict', '').strip().lower()
        owner_user_id = None if principal['kind'] == 'admin' else principal['user']['user_id']
        sessions = self.session_store.get_recent_sessions(
            n=limit,
            owner_user_id=owner_user_id,
            query_text=query_text,
            backend_filter=backend_filter,
            conflict_filter=conflict_filter,
        )
        payload = [self._session_summary(item) for item in sessions]
        return web.json_response({'sessions': payload})

    async def handle_session(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        owner_user_id = None if principal['kind'] == 'admin' else principal['user']['user_id']
        session = self.session_store.get_session(request.match_info['session_id'], owner_user_id=owner_user_id)
        if session is None:
            raise web.HTTPNotFound(text=f"Session not found: {request.match_info['session_id']}")
        return web.json_response(self._session_payload(session, request))

    async def handle_public_share(self, request: web.Request) -> web.Response:
        session = self.session_store.get_shared_session(request.match_info['share_id'])
        if session is None:
            raise web.HTTPNotFound(text='Shared session not found.')
        return web.json_response(self._public_shared_session(session, request))

    async def handle_session_export(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        owner_user_id = None if principal['kind'] == 'admin' else principal['user']['user_id']
        session = self.session_store.get_session(request.match_info['session_id'], owner_user_id=owner_user_id)
        if session is None:
            raise web.HTTPNotFound(text=f"Session not found: {request.match_info['session_id']}")
        export_format = request.query.get('format', 'markdown').strip().lower()
        if export_format == 'json':
            body = json.dumps(session, indent=2)
            return web.Response(
                text=body,
                content_type='application/json',
                headers={
                    'Content-Disposition': f'attachment; filename="{session["session_id"]}.json"',
                },
            )
        # Decision memo exports
        if export_format in ('research_brief', 'risk_memo', 'investment_memo'):
            body = generate_memo(session, export_format)
            return web.Response(
                text=body,
                content_type='text/markdown',
                headers={
                    'Content-Disposition': f'attachment; filename="{session["session_id"]}_{export_format}.md"',
                },
            )
        if export_format != 'markdown':
            raise web.HTTPBadRequest(text='format must be markdown, json, research_brief, risk_memo, or investment_memo')
        body = self._render_session_markdown(session)
        return web.Response(
            text=body,
            content_type='text/markdown',
            headers={
                'Content-Disposition': f'attachment; filename="{session["session_id"]}.md"',
            },
        )

    async def handle_session_feedback(self, request: web.Request) -> web.Response:
        """Save user feedback (thumbs up/down + tags) for a session."""
        principal = self._resolve_principal(request)
        # Allow guest feedback too — anyone who can see a session can rate it
        session_id = request.match_info['session_id']
        payload = await self._read_json(request)
        rating = payload.get('rating')
        if rating not in (1, -1):
            raise web.HTTPBadRequest(text='Field "rating" must be 1 or -1.')
        tags = payload.get('tags', [])
        if not isinstance(tags, list):
            tags = []
        feedback = self.feedback_store.save_feedback(session_id, rating, tags)
        return web.json_response({'ok': True, 'feedback': feedback})

    async def handle_session_outcome(self, request: web.Request) -> web.Response:
        """Record what actually happened — was the verdict right?"""
        session_id = request.match_info['session_id']
        payload = await self._read_json(request)
        outcome = payload.get('outcome', '')
        if outcome not in ('confirmed', 'refuted', 'partially_correct', 'still_pending'):
            raise web.HTTPBadRequest(text='outcome must be: confirmed, refuted, partially_correct, still_pending')
        note = str(payload.get('note', ''))[:500]
        data = self.feedback_store.record_outcome(session_id, outcome, note)
        return web.json_response({'ok': True, 'feedback': data})

    async def handle_claim_feedback(self, request: web.Request) -> web.Response:
        """Record feedback on an individual claim."""
        session_id = request.match_info['session_id']
        payload = await self._read_json(request)
        claim_id = payload.get('claim_id', '')
        claim_text = payload.get('claim_text', '')
        outcome = payload.get('outcome', '')
        if outcome not in ('confirmed', 'refuted', 'pending'):
            raise web.HTTPBadRequest(text='outcome must be: confirmed, refuted, pending')
        if not claim_id:
            raise web.HTTPBadRequest(text='claim_id is required')
        note = str(payload.get('note', ''))[:500]
        data = self.feedback_store.record_claim_feedback(session_id, claim_id, claim_text, outcome, note)
        return web.json_response({'ok': True, 'feedback': data})

    async def handle_session_note(self, request: web.Request) -> web.Response:
        """Add a free-text note to a session."""
        session_id = request.match_info['session_id']
        payload = await self._read_json(request)
        text = str(payload.get('text', '')).strip()
        if not text:
            raise web.HTTPBadRequest(text='text is required')
        data = self.feedback_store.add_note(session_id, text)
        return web.json_response({'ok': True, 'feedback': data})

    async def handle_feedback_stats(self, request: web.Request) -> web.Response:
        """Aggregate feedback stats — no auth required (read-only, non-sensitive)."""
        stats = self.feedback_store.get_stats()
        return web.json_response(stats)

    async def handle_session_drift(self, request: web.Request) -> web.Response:
        """Get verdict drift analysis for a session — compare to similar past sessions."""
        session_id = request.match_info['session_id']
        session = self.session_store.get_session(session_id)
        if session is None:
            raise web.HTTPNotFound(text='Session not found.')
        drift = build_drift_analysis(session, self.session_store.sessions_dir)
        if drift is None:
            return web.json_response({'has_drift': False, 'similar_sessions': []})
        return web.json_response(drift)

    async def handle_claim_ledger(self, request: web.Request) -> web.Response:
        """Global claim statistics across all sessions — no auth required."""
        ledger = build_claim_ledger(self.session_store.sessions_dir)
        return web.json_response(ledger)

    async def handle_claim_store_stats(self, request: web.Request) -> web.Response:
        """Persistent claim store statistics."""
        store = ClaimStore(self.root)
        return web.json_response(store.get_stats())

    async def handle_claim_search(self, request: web.Request) -> web.Response:
        """Search claims by text."""
        q = request.query.get('q', '').strip()
        if not q or len(q) < 2:
            raise web.HTTPBadRequest(text='Query must be at least 2 characters.')
        limit = min(int(request.query.get('limit', '20')), 50)
        store = ClaimStore(self.root)
        results = store.search_claims(q, limit=limit)
        return web.json_response({'results': results, 'count': len(results)})

    async def handle_recurring_claims(self, request: web.Request) -> web.Response:
        """Get claims that appear across multiple sessions."""
        min_appearances = max(2, int(request.query.get('min', '2')))
        limit = min(int(request.query.get('limit', '20')), 50)
        store = ClaimStore(self.root)
        results = store.get_recurring_claims(min_appearances=min_appearances, limit=limit)
        return web.json_response({'results': results, 'count': len(results)})

    async def handle_claim_detail(self, request: web.Request) -> web.Response:
        """Get full claim record by canonical ID."""
        claim_id = request.match_info['claim_id']
        store = ClaimStore(self.root)
        record = store.get_claim(claim_id)
        if record is None:
            raise web.HTTPNotFound(text='Claim not found.')
        return web.json_response(record)

    # ------------------------------------------------------------------
    # Workspace handlers
    # ------------------------------------------------------------------

    async def handle_create_workspace(self, request: web.Request) -> web.Response:
        payload = await self._read_json(request)
        name = payload.get('name', '').strip()
        if not name:
            raise web.HTTPBadRequest(text='name is required')
        principal = self._resolve_principal(request)
        user_id = principal.get('user_id') if principal else None
        store = WorkspaceStore(self.root)
        ws = store.create_workspace(name, payload.get('description', ''), owner_user_id=user_id)
        return web.json_response(ws, status=201)

    async def handle_list_workspaces(self, request: web.Request) -> web.Response:
        principal = self._resolve_principal(request)
        user_id = principal.get('user_id') if principal else None
        store = WorkspaceStore(self.root)
        workspaces = store.list_workspaces(owner_user_id=user_id)
        return web.json_response({'workspaces': workspaces})

    async def handle_get_workspace(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        store = WorkspaceStore(self.root)
        ws = store.get_workspace(wid)
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_update_workspace(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        payload = await self._read_json(request)
        store = WorkspaceStore(self.root)
        ws = store.update_workspace(wid, name=payload.get('name'), description=payload.get('description'))
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_delete_workspace(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        store = WorkspaceStore(self.root)
        if not store.delete_workspace(wid):
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response({'ok': True})

    async def handle_workspace_add_session(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        payload = await self._read_json(request)
        session_id = payload.get('session_id', '')
        if not session_id:
            raise web.HTTPBadRequest(text='session_id is required')
        store = WorkspaceStore(self.root)
        ws = store.add_session(wid, session_id)
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_workspace_remove_session(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        sid = request.match_info['session_id']
        store = WorkspaceStore(self.root)
        ws = store.remove_session(wid, sid)
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_workspace_pin_claim(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        payload = await self._read_json(request)
        claim_id = payload.get('claim_id', '')
        if not claim_id:
            raise web.HTTPBadRequest(text='claim_id is required')
        store = WorkspaceStore(self.root)
        ws = store.pin_claim(wid, claim_id, payload.get('claim_text', ''), payload.get('note', ''))
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_workspace_unpin_claim(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        cid = request.match_info['claim_id']
        store = WorkspaceStore(self.root)
        ws = store.unpin_claim(wid, cid)
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_workspace_pin_evidence(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        payload = await self._read_json(request)
        url = payload.get('url', '')
        if not url:
            raise web.HTTPBadRequest(text='url is required')
        store = WorkspaceStore(self.root)
        ws = store.pin_evidence(wid, url, payload.get('title', ''), payload.get('trust_tier', ''), payload.get('note', ''))
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_workspace_unpin_evidence(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        payload = await self._read_json(request)
        url = payload.get('url', '')
        if not url:
            raise web.HTTPBadRequest(text='url is required')
        store = WorkspaceStore(self.root)
        ws = store.unpin_evidence(wid, url)
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_workspace_add_note(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        payload = await self._read_json(request)
        text = payload.get('text', '').strip()
        if not text:
            raise web.HTTPBadRequest(text='text is required')
        store = WorkspaceStore(self.root)
        ws = store.add_note(wid, text)
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    async def handle_workspace_delete_note(self, request: web.Request) -> web.Response:
        wid = request.match_info['workspace_id']
        nid = request.match_info['note_id']
        store = WorkspaceStore(self.root)
        ws = store.delete_note(wid, nid)
        if ws is None:
            raise web.HTTPNotFound(text='Workspace not found.')
        return web.json_response(ws)

    # ------------------------------------------------------------------
    # Watchlist handlers
    # ------------------------------------------------------------------

    async def handle_watchlist_watch(self, request: web.Request) -> web.Response:
        user = self._require_principal(request)
        body = await request.json()
        claim_id = body.get('claim_id', '').strip()
        if not claim_id:
            raise web.HTTPBadRequest(text='claim_id is required.')
        store = WatchlistStore(self.root)
        record = store.watch(
            claim_id=claim_id,
            claim_text=body.get('claim_text', ''),
            current_status=body.get('current_status', ''),
            current_score=body.get('current_score'),
            user_id=user,
        )
        return web.json_response(record)

    async def handle_watchlist_unwatch(self, request: web.Request) -> web.Response:
        self._require_principal(request)
        body = await request.json()
        claim_id = body.get('claim_id', '').strip()
        if not claim_id:
            raise web.HTTPBadRequest(text='claim_id is required.')
        store = WatchlistStore(self.root)
        removed = store.unwatch(claim_id)
        return web.json_response({'removed': removed})

    async def handle_watchlist_list(self, request: web.Request) -> web.Response:
        user = self._require_principal(request)
        store = WatchlistStore(self.root)
        items = store.list_watched(user_id=user)
        return web.json_response({'watched': items, 'total': len(items)})

    async def handle_watchlist_refresh(self, request: web.Request) -> web.Response:
        self._require_principal(request)
        watchlist = WatchlistStore(self.root)
        claim_store = ClaimStore(self.root)
        changed = watchlist.refresh_from_claim_store(claim_store)
        return web.json_response({'changed': changed, 'total_changed': len(changed)})

    async def handle_watchlist_stats(self, request: web.Request) -> web.Response:
        self._require_principal(request)
        store = WatchlistStore(self.root)
        return web.json_response(store.get_stats())

    async def handle_watchlist_detail(self, request: web.Request) -> web.Response:
        self._require_principal(request)
        claim_id = request.match_info['claim_id']
        store = WatchlistStore(self.root)
        record = store.get_watched(claim_id)
        if record is None:
            raise web.HTTPNotFound(text='Claim not on watchlist.')
        return web.json_response(record)

    async def handle_benchmark_report(self, request: web.Request) -> web.Response:
        self._require_principal(request)
        report = self._render_benchmark_markdown()
        return web.Response(
            text=report,
            content_type='text/markdown',
            headers={'Content-Disposition': 'attachment; filename="hermes_benchmark_report.md"'},
        )

    async def handle_loop_status(self, request: web.Request) -> web.Response:
        """
        Returns the full Ouroboros loop status for the dashboard.
        No auth required — read-only, contains no sensitive data.
        """
        training_status = get_training_status(self.root)
        trajectory_stats = build_stats(self.root)
        sessions = self.session_store.get_recent_sessions(n=1000)

        # Count DPO pairs collected across all sessions
        dpo_dir = self.root / 'trajectories' / 'dpo'
        dpo_pair_files = list(dpo_dir.glob('*.json')) if dpo_dir.exists() else []
        total_dpo_pairs = 0
        for f in dpo_pair_files:
            try:
                import json as _json
                pairs = _json.loads(f.read_text(encoding='utf-8'))
                total_dpo_pairs += len(pairs) if isinstance(pairs, list) else 0
            except Exception:
                pass

        # Model history from models dir
        models_dir = self.root / 'models'
        model_versions = []
        if models_dir.exists():
            for entry in sorted(models_dir.iterdir()):
                result_path = entry / 'training_result.json'
                if result_path.exists():
                    try:
                        import json as _json
                        res = _json.loads(result_path.read_text(encoding='utf-8'))
                        model_versions.append({
                            'name': entry.name,
                            'loss': res.get('final_training_loss'),
                            'steps': res.get('steps'),
                            'dry_run': res.get('dry_run', True),
                            'mode': res.get('mode', 'sft'),
                        })
                    except Exception:
                        pass

        return web.json_response({
            'loop': {
                'current_version': training_status.get('current_version', 'v0'),
                'next_version': training_status.get('next_version', 'v1'),
                'auto_train_enabled': training_status.get('auto_train_enabled', False),
                'auto_train_threshold': training_status.get('auto_train_threshold', 50),
                'remaining_until_next_cycle': training_status.get('remaining_until_next_cycle', 0),
                'new_high_quality_since_latest': training_status.get('new_high_quality_since_latest', 0),
                'high_quality_total': training_status.get('high_quality_total', 0),
                'auto_train_state': training_status.get('auto_train_state'),
            },
            'trajectories': trajectory_stats,
            'dpo': {
                'total_pairs': total_dpo_pairs,
                'sessions_with_pairs': len(dpo_pair_files),
            },
            'sessions': {
                'total': len(sessions),
                'average_confidence': self._average_confidence(sessions),
            },
            'model_history': model_versions,
        })

    async def handle_compare_benchmark(self, request: web.Request) -> web.Response:
        """Pre-computed benchmark comparison: v0 (base) vs latest trained results."""
        v0_path = self.root / 'benchmark' / 'results_v0.json'
        # Try v5 first (latest), fall back to v1
        latest_path = self.root / 'benchmark' / 'results_v5.json'
        if not latest_path.exists():
            latest_path = self.root / 'benchmark' / 'results_v1.json'
        if not v0_path.exists() or not latest_path.exists():
            return web.json_response({'available': False, 'comparisons': []})
        v0 = json.loads(v0_path.read_text(encoding='utf-8'))
        latest = json.loads(latest_path.read_text(encoding='utf-8'))
        comparisons = []
        v0_results = {r['query']: r for r in v0.get('results', [])}
        for trained_r in latest.get('results', []):
            query = trained_r['query']
            base_r = v0_results.get(query)
            if base_r:
                comparisons.append({
                    'query': query,
                    'base_confidence': base_r.get('confidence_score', 0),
                    'trained_confidence': trained_r.get('confidence_score', 0),
                    'delta': trained_r.get('confidence_score', 0) - base_r.get('confidence_score', 0),
                    'base_quality': base_r.get('response_quality_score', 0),
                    'trained_quality': trained_r.get('response_quality_score', 0),
                    'quality_delta': trained_r.get('response_quality_score', 0) - base_r.get('response_quality_score', 0),
                })
        avg_delta = round(sum(c['delta'] for c in comparisons) / max(1, len(comparisons)), 1) if comparisons else 0
        avg_quality_delta = round(sum(c['quality_delta'] for c in comparisons) / max(1, len(comparisons)), 1) if comparisons else 0
        improved = sum(1 for c in comparisons if c['delta'] > 0 or c['quality_delta'] > 0)
        return web.json_response({
            'available': True,
            'v0_label': v0.get('label', 'base'),
            'trained_label': latest.get('label', 'trained'),
            'avg_confidence_delta': avg_delta,
            'avg_quality_delta': avg_quality_delta,
            'improvement_pct': round(improved / max(1, len(comparisons)) * 100, 1),
            'comparisons': comparisons,
        })

    async def handle_council_vs_solo_benchmark(self, request: web.Request) -> web.Response:
        """Pre-computed council vs solo benchmark results. No auth — read-only showcase data."""
        # Check mounted volume first, then local benchmark dir
        path = self.root / 'benchmark_results' / 'results_council_vs_solo.json'
        if not path.exists():
            path = self.root / 'benchmark' / 'results_council_vs_solo.json'
        if not path.exists():
            return web.json_response({'available': False})
        data = json.loads(path.read_text(encoding='utf-8'))
        data['available'] = True
        return web.json_response(data)

    async def handle_export_dpo(self, request: web.Request) -> web.Response:
        """Export DPO dataset as JSONL (HuggingFace standard)."""
        pairs = build_dpo_dataset(self.root)
        fmt = request.query.get('format', 'jsonl')
        if fmt == 'jsonl':
            lines = []
            for pair in pairs:
                lines.append(json.dumps({
                    'prompt': pair.get('prompt', ''),
                    'chosen': pair.get('chosen', ''),
                    'rejected': pair.get('rejected', ''),
                }, ensure_ascii=False))
            content = '\n'.join(lines)
            return web.Response(
                text=content,
                content_type='application/jsonl',
                headers={'Content-Disposition': 'attachment; filename="hermes_dpo_dataset.jsonl"'},
            )
        return web.json_response(pairs)

    async def handle_skills_list(self, request: web.Request) -> web.Response:
        """List auto-created skills."""
        skills_dir = self.root / 'skills'
        skills = []
        if skills_dir.exists():
            for path in sorted(skills_dir.glob('auto_*.md')):
                content = path.read_text(encoding='utf-8')
                first_line = content.split('\n', 1)[0].strip().lstrip('#').strip()
                skills.append({
                    'filename': path.name,
                    'title': first_line or path.stem,
                    'size_bytes': path.stat().st_size,
                })
        return web.json_response({'skills': skills, 'total': len(skills)})

    async def handle_research_analysis(self, request: web.Request) -> web.Response:
        """Comprehensive research analysis data for the technical report page."""
        from benchmark.common import response_quality_score

        # 1. Benchmark data
        bench_path = self.root / 'benchmark_results' / 'results_council_vs_solo.json'
        if not bench_path.exists():
            bench_path = self.root / 'benchmark' / 'results_council_vs_solo.json'
        bench_data = None
        if bench_path.exists():
            bench_data = json.loads(bench_path.read_text(encoding='utf-8'))

        # 2. Loop / training data (inline — mirrors handle_loop_status)
        models_dir = self.root / 'models'
        model_versions = []
        if models_dir.exists():
            for entry in sorted(models_dir.iterdir()):
                result_path = entry / 'training_result.json'
                if result_path.exists():
                    try:
                        res = json.loads(result_path.read_text(encoding='utf-8'))
                        model_versions.append({
                            'name': entry.name,
                            'loss': res.get('final_training_loss'),
                            'steps': res.get('steps'),
                            'mode': res.get('mode', 'sft'),
                        })
                    except Exception:
                        pass
        sessions = self.session_store.get_recent_sessions(n=1000)
        dpo_dir = self.root / 'trajectories' / 'dpo'
        dpo_pair_files = list(dpo_dir.glob('*.json')) if dpo_dir.exists() else []
        total_dpo_count = 0
        for f in dpo_pair_files:
            try:
                p = json.loads(f.read_text(encoding='utf-8'))
                total_dpo_count += len(p) if isinstance(p, list) else 0
            except Exception:
                pass
        loop_data = {
            'total_sessions': len(sessions),
            'avg_confidence': round(self._average_confidence(sessions), 1),
            'total_dpo_pairs': total_dpo_count,
            'model_history': model_versions,
        }

        # 3. DPO quality validation
        dpo_pairs = build_dpo_dataset(self.root)

        def _text_quality(text: str) -> int:
            low = text.lower()
            s = 0
            if len(text) >= 600: s += 25
            elif len(text) >= 300: s += 15
            elif len(text) >= 100: s += 8
            if any(k in low for k in ('however', 'on the other hand', 'counter-argument', 'nuance', 'caveat', 'alternatively')): s += 15
            if any(k in low for k in ('study', 'research', 'data', 'according to', 'evidence', 'literature')): s += 15
            if any(k in low for k in ('first', 'second', 'argument for', 'pros', 'cons', '1.', '2.', '3.')): s += 15
            if any(k in low for k in ('uncertain', 'unclear', 'debatable', 'depends', 'complex', 'mixed')): s += 10
            if any(c.isdigit() for c in text) and '%' in text: s += 10
            if any(k in low for k in ('risk', 'trade-off', 'downside', 'weakness')): s += 10
            return min(s, 100)

        dpo_validation = None
        if dpo_pairs:
            chosen_scores = [_text_quality(p.get('chosen', '')) for p in dpo_pairs]
            rejected_scores = [_text_quality(p.get('rejected', '')) for p in dpo_pairs]
            n = len(dpo_pairs)
            avg_c = sum(chosen_scores) / n
            avg_r = sum(rejected_scores) / n
            c_wins = sum(1 for c, r in zip(chosen_scores, rejected_scores) if c > r)
            r_wins = sum(1 for c, r in zip(chosen_scores, rejected_scores) if r > c)
            dpo_validation = {
                'total_pairs': n,
                'avg_chosen_quality': round(avg_c, 1),
                'avg_rejected_quality': round(avg_r, 1),
                'quality_gap': round(avg_c - avg_r, 1),
                'chosen_win_rate': round(c_wins / n * 100, 1),
                'rejected_win_rate': round(r_wins / n * 100, 1),
                'tie_rate': round((n - c_wins - r_wins) / n * 100, 1),
                'avg_chosen_length': round(sum(len(p.get('chosen', '')) for p in dpo_pairs) / n),
                'avg_rejected_length': round(sum(len(p.get('rejected', '')) for p in dpo_pairs) / n),
            }

        # 4. Per-category analysis from benchmark
        per_category = {}
        confidence_cal = {'low_0_60': [], 'mid_60_80': [], 'high_80_100': []}
        if bench_data and bench_data.get('results'):
            for r in bench_data['results']:
                cat = r.get('category', 'unknown')
                if cat not in per_category:
                    per_category[cat] = {'solo_q': [], 'council_q': [], 'conf': [], 'c_wins': 0, 's_wins': 0}
                sq = r['solo']['quality_score']
                cq = r['council'].get('quality_score', 0)
                conf = r['council'].get('confidence_score', -1)
                per_category[cat]['solo_q'].append(sq)
                per_category[cat]['council_q'].append(cq)
                if conf >= 0:
                    per_category[cat]['conf'].append(conf)
                if cq > sq: per_category[cat]['c_wins'] += 1
                elif sq > cq: per_category[cat]['s_wins'] += 1
                # Confidence calibration
                if conf >= 0:
                    if conf < 60: confidence_cal['low_0_60'].append(cq)
                    elif conf < 80: confidence_cal['mid_60_80'].append(cq)
                    else: confidence_cal['high_80_100'].append(cq)

        per_cat_summary = {}
        for cat, d in per_category.items():
            n = len(d['solo_q'])
            per_cat_summary[cat] = {
                'n': n,
                'avg_solo': round(sum(d['solo_q']) / n, 1),
                'avg_council': round(sum(d['council_q']) / n, 1),
                'avg_confidence': round(sum(d['conf']) / len(d['conf']), 1) if d['conf'] else 0,
                'council_wins': d['c_wins'],
                'solo_wins': d['s_wins'],
            }

        conf_cal_summary = {k: {'n': len(v), 'avg_quality': round(sum(v) / len(v), 1)} for k, v in confidence_cal.items() if v}

        return web.json_response({
            'benchmark': bench_data.get('summary') if bench_data else None,
            'benchmark_claims': bench_data.get('total_claims', 0) if bench_data else 0,
            'per_category': per_cat_summary,
            'confidence_calibration': conf_cal_summary,
            'dpo_validation': dpo_validation,
            'training': loop_data,
        })

    async def handle_create_share(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        self._require_same_origin(request)
        self._require_csrf_token(request, principal)
        owner_user_id = None if principal['kind'] == 'admin' else principal['user']['user_id']
        session = self.session_store.create_share(request.match_info['session_id'], owner_user_id=owner_user_id)
        if session is None:
            raise web.HTTPNotFound(text=f"Session not found: {request.match_info['session_id']}")
        return web.json_response(self._share_payload(session, request))

    async def handle_revoke_share(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        self._require_same_origin(request)
        self._require_csrf_token(request, principal)
        owner_user_id = None if principal['kind'] == 'admin' else principal['user']['user_id']
        session = self.session_store.revoke_share(request.match_info['session_id'], owner_user_id=owner_user_id)
        if session is None:
            raise web.HTTPNotFound(text=f"Session not found: {request.match_info['session_id']}")
        return web.json_response(self._share_payload(session, request))

    async def handle_query(self, request: web.Request) -> web.Response:
        principal = self._resolve_principal(request)
        if principal is not None and principal['kind'] != 'api_key':
            self._require_same_origin(request)
            self._require_csrf_token(request, principal)
        elif principal is None:
            self._require_same_origin(request)
        await self._enforce_rate_limit(principal, request)
        payload = await self._read_json(request)

        query = str(payload.get('query') or '').strip()
        if not query:
            raise web.HTTPBadRequest(text='Field "query" is required.')
        if len(query) > 4000:
            raise web.HTTPBadRequest(text='Field "query" must be 4000 characters or fewer.')

        mode = str(payload.get('mode') or 'default').strip().lower()
        if mode not in {'default', 'trained'}:
            raise web.HTTPBadRequest(text='Field "mode" must be "default" or "trained".')

        analysis_mode = str(payload.get('analysis_mode') or 'default').strip().lower()
        if analysis_mode not in {'default', 'red_team', 'verify', 'research'}:
            raise web.HTTPBadRequest(text='Field "analysis_mode" must be "default", "red_team", "verify", or "research".')

        result, runtime_meta = await self.runtime.run_query(
            query, mode=mode, analysis_mode=analysis_mode,
        )
        if principal is not None and principal['kind'] == 'user':
            owned = self.session_store.attach_owner(
                session_id=str(result.get('session_id')),
                user_id=principal['user']['user_id'],
                email=principal['user']['email'],
            )
            if owned is not None:
                result = owned
        return web.json_response({'runtime': runtime_meta, 'result': result})

    async def handle_query_stream(self, request: web.Request) -> web.StreamResponse:
        """SSE endpoint — streams agent completion events as they happen, then the final result."""
        principal = self._resolve_principal(request)
        if principal is not None:
            self._require_same_origin(request)
            self._require_csrf_token(request, principal)
        else:
            self._require_same_origin(request)
        await self._enforce_rate_limit(principal, request)
        payload = await self._read_json(request)

        query = str(payload.get('query') or '').strip()
        if not query:
            raise web.HTTPBadRequest(text='Field "query" is required.')
        if len(query) > 4000:
            raise web.HTTPBadRequest(text='Field "query" must be 4000 characters or fewer.')

        mode = str(payload.get('mode') or 'default').strip().lower()
        if mode not in {'default', 'trained'}:
            raise web.HTTPBadRequest(text='Field "mode" must be "default" or "trained".')

        analysis_mode = str(payload.get('analysis_mode') or 'default').strip().lower()
        if analysis_mode not in {'default', 'red_team', 'verify', 'research'}:
            raise web.HTTPBadRequest(text='Field "analysis_mode" must be "default", "red_team", "verify", or "research".')

        response = web.StreamResponse()
        response.headers['Content-Type'] = 'text/event-stream'
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['X-Accel-Buffering'] = 'no'
        await response.prepare(request)

        event_queue: asyncio.Queue = asyncio.Queue()

        async def agent_stream_callback(role: str, agent_response: str, meta: dict) -> None:
            event = {
                'type': 'agent_complete',
                'role': role,
                'duration_seconds': meta.get('duration_seconds'),
                'status': meta.get('status', 'ok'),
                'preview': (agent_response or '')[:200],
            }
            await event_queue.put(event)

        async def agent_token_callback(role: str, token: str) -> None:
            await event_queue.put({'type': 'agent_token', 'role': role, 'token': token})

        async def run_council() -> None:
            try:
                result, runtime_meta = await self.runtime.run_query(
                    query, mode=mode, stream_callback=agent_stream_callback,
                    token_callback=agent_token_callback, analysis_mode=analysis_mode,
                )
                if principal is not None and principal['kind'] == 'user':
                    owned = self.session_store.attach_owner(
                        session_id=str(result.get('session_id')),
                        user_id=principal['user']['user_id'],
                        email=principal['user']['email'],
                    )
                    if owned is not None:
                        result = owned
                await event_queue.put({'type': 'final', 'result': result, 'runtime': runtime_meta})
            except Exception as exc:
                await event_queue.put({'type': 'error', 'message': str(exc)})

        asyncio.create_task(run_council())

        try:
            while True:
                event = await asyncio.wait_for(event_queue.get(), timeout=300.0)
                data = json.dumps(event)
                await response.write(f'data: {data}\n\n'.encode('utf-8'))
                if event.get('type') in {'final', 'error'}:
                    break
        except asyncio.TimeoutError:
            await response.write(b'data: {"type":"error","message":"stream timeout"}\n\n')
        return response

    async def handle_solo_query(self, request: web.Request) -> web.Response:
        """Single-model response for head-to-head comparison with the full council."""
        principal = self._resolve_principal(request)
        if principal is not None:
            self._require_same_origin(request)
            self._require_csrf_token(request, principal)
        else:
            self._require_same_origin(request)
        await self._enforce_rate_limit(principal, request)
        payload = await self._read_json(request)

        query = str(payload.get('query') or '').strip()
        if not query:
            raise web.HTTPBadRequest(text='Field "query" is required.')
        if len(query) > 4000:
            raise web.HTTPBadRequest(text='Field "query" must be 4000 characters or fewer.')

        solo_system_prompt = (
            'You are a helpful AI assistant. Analyze the following question or claim thoroughly. '
            'Provide your honest assessment with key arguments for and against. Be concise but comprehensive.'
        )

        import time
        t0 = time.monotonic()
        try:
            response_text = await self.orchestrator.provider.generate(
                'solo', solo_system_prompt, query,
            )
        except Exception as exc:
            raise web.HTTPInternalServerError(text=f'Solo generation failed: {exc}') from exc
        elapsed = round(time.monotonic() - t0, 2)

        return web.json_response({'response': response_text, 'elapsed_seconds': elapsed})

    async def _read_json(self, request: web.Request) -> dict[str, Any]:
        try:
            payload = await request.json()
        except Exception as exc:
            raise web.HTTPBadRequest(text=f'Invalid JSON payload: {exc}') from exc
        if not isinstance(payload, dict):
            raise web.HTTPBadRequest(text='JSON payload must be an object.')
        return payload

    def _session_summary(self, session: dict[str, Any]) -> dict[str, Any]:
        backend = self._arbiter_meta(session).get('backend')
        return {
            'session_id': session.get('session_id'),
            'query': session.get('query'),
            'timestamp': session.get('timestamp'),
            'confidence_score': session.get('confidence_score'),
            'elapsed_seconds': session.get('elapsed_seconds'),
            'conflict_detected': session.get('conflict_detected'),
            'owner_email': session.get('owner_email'),
            'backend': backend,
            'has_skill': bool(session.get('skill_path')),
            'is_shared': bool(session.get('share_id')),
        }

    def _session_payload(self, session: dict[str, Any], request: web.Request) -> dict[str, Any]:
        payload = dict(session)
        if session.get('share_id'):
            payload['share_url'] = self._share_url(request, str(session['share_id']))
        # Attach feedback if exists
        feedback = self.feedback_store.get_feedback(str(session.get('session_id', '')))
        if feedback:
            payload['feedback'] = feedback
        return payload

    def _public_shared_session(self, session: dict[str, Any], request: web.Request) -> dict[str, Any]:
        return {
            'session_id': session.get('session_id'),
            'share_id': session.get('share_id'),
            'share_url': self._share_url(request, str(session.get('share_id') or '')),
            'shared_at': session.get('shared_at'),
            'query': session.get('query'),
            'timestamp': session.get('timestamp'),
            'confidence_score': session.get('confidence_score'),
            'elapsed_seconds': session.get('elapsed_seconds'),
            'conflict_detected': session.get('conflict_detected'),
            'conflict_summary': session.get('conflict_summary'),
            'arbiter_verdict': session.get('arbiter_verdict'),
            'additional_research': session.get('additional_research'),
            'agent_responses': session.get('agent_responses', {}),
            'agent_timings': self._public_agent_timings(session),
        }

    def _share_payload(self, session: dict[str, Any], request: web.Request) -> dict[str, Any]:
        share_id = session.get('share_id')
        return {
            'session_id': session.get('session_id'),
            'is_shared': bool(share_id),
            'share_id': share_id,
            'share_url': self._share_url(request, str(share_id)) if share_id else None,
            'shared_at': session.get('shared_at'),
        }

    def _share_url(self, request: web.Request, share_id: str) -> str:
        base_url = self._external_base_url(request)
        if base_url:
            return f'{base_url}/share/{share_id}'
        return f'/share/{share_id}'

    def _external_base_url(self, request: web.Request) -> str:
        configured = (self.settings.web.public_base_url or '').strip().rstrip('/')
        if configured:
            return self._sanitize_base_url(configured)
        forwarded_proto = request.headers.get('X-Forwarded-Proto', '').split(',')[0].strip().lower()
        forwarded_host = request.headers.get('X-Forwarded-Host', '').split(',')[0].strip()
        if forwarded_proto in {'http', 'https'} and forwarded_host:
            sanitized = self._sanitize_base_url(f'{forwarded_proto}://{forwarded_host}')
            if sanitized:
                return sanitized
        host = request.headers.get('Host', '').strip()
        if host:
            return self._sanitize_base_url(f'{request.scheme}://{host}')
        return ''

    def _render_share_html(self, session: dict[str, Any], request: web.Request) -> str:
        query = str(session.get('query') or f"Hermes Session {str(session.get('session_id') or '')[:8]}")
        verdict = str(session.get('arbiter_verdict') or '').strip()
        verdict_preview = verdict.replace('\r', ' ').replace('\n', ' ')
        if len(verdict_preview) > 240:
            verdict_preview = verdict_preview[:237].rstrip() + '...'
        share_url = self._share_url(request, str(session.get('share_id') or ''))
        confidence = session.get('confidence_score', 'n/a')
        elapsed = session.get('elapsed_seconds', 'n/a')
        conflict_text = 'Conflict detected' if session.get('conflict_detected') else 'Agents aligned'
        conflict_summary = str(session.get('conflict_summary') or 'No conflict summary available.')
        timestamp = str(session.get('timestamp') or '')
        shared_at = str(session.get('shared_at') or '')
        additional_research = str(session.get('additional_research') or '').strip()
        agent_cards: list[str] = []
        for role, response in session.get('agent_responses', {}).items():
            timing = session.get('agent_timings', {}).get(role, {})
            duration = timing.get('duration_seconds', 'n/a')
            status = timing.get('status', 'unknown')
            agent_cards.append(
                f"""
                <div class="panel">
                  <div class="label">{html.escape(str(role).title())}</div>
                  <strong>{html.escape(str(status).title())}</strong>
                  <p class="copy">{html.escape(str(duration))}s</p>
                  <details>
                    <summary>Show full response</summary>
                    <pre>{html.escape(str(response))}</pre>
                  </details>
                </div>
                """
            )
        if not agent_cards:
            agent_cards.append('<div class="empty">No agent outputs recorded.</div>')
        research_block = ''
        if additional_research:
            research_block = f"""
            <div class="detail-grid">
              <div class="panel" style="grid-column: 1 / -1;">
                <div class="label">Additional Research</div>
                <strong>Supporting material</strong>
                <p class="copy">{html.escape(additional_research)}</p>
              </div>
            </div>
            """
        return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{html.escape(query)} | Hermes Shared Verdict</title>
    <meta name="description" content="{html.escape(verdict_preview or conflict_summary)}">
    <meta name="robots" content="noindex">
    <link rel="canonical" href="{html.escape(share_url)}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="{html.escape(query)}">
    <meta property="og:description" content="{html.escape(verdict_preview or conflict_summary)}">
    <meta property="og:url" content="{html.escape(share_url)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{html.escape(query)}">
    <meta name="twitter:description" content="{html.escape(verdict_preview or conflict_summary)}">
    <style>
      :root {{
        --ink: #201810;
        --muted: #6d6257;
        --line: rgba(32, 24, 16, 0.12);
        --accent: #ab4d2a;
        --paper: rgba(255, 251, 244, 0.92);
        --shadow: 0 24px 60px rgba(65, 43, 20, 0.14);
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        min-height: 100vh;
        color: var(--ink);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(171, 77, 42, 0.16), transparent 30%),
          radial-gradient(circle at bottom right, rgba(63, 102, 91, 0.12), transparent 24%),
          linear-gradient(135deg, #efe3cf 0%, #faf6ee 56%, #ece0d1 100%);
      }}
      .page {{ width: min(980px, calc(100vw - 28px)); margin: 22px auto 36px; }}
      .card {{
        padding: 24px;
        border-radius: 28px;
        border: 1px solid var(--line);
        background: var(--paper);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }}
      .eyebrow {{
        display: inline-block;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(171, 77, 42, 0.1);
        color: var(--accent);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }}
      h1 {{
        margin: 14px 0 8px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(32px, 6vw, 54px);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }}
      .lede, .copy, .mini {{ color: var(--muted); line-height: 1.6; }}
      .metric-grid, .detail-grid, .agent-grid {{ display: grid; gap: 12px; margin-top: 18px; }}
      .metric-grid {{ grid-template-columns: repeat(4, minmax(0, 1fr)); }}
      .detail-grid {{ grid-template-columns: 1.15fr 0.85fr; }}
      .agent-grid {{ grid-template-columns: 1fr 1fr; }}
      .panel {{
        padding: 16px;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.72);
      }}
      .label {{
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }}
      strong {{ display: block; margin-top: 6px; font-size: 18px; }}
      details {{ margin-top: 10px; }}
      summary {{ cursor: pointer; color: var(--accent); font-weight: 700; }}
      pre {{
        margin: 10px 0 0;
        padding: 14px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: #241c15;
        color: #f7f0df;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: Consolas, "Courier New", monospace;
        font-size: 12px;
      }}
      .empty {{
        margin-top: 18px;
        padding: 18px;
        border-radius: 18px;
        border: 1px dashed var(--line);
        background: rgba(255, 255, 255, 0.45);
        color: var(--muted);
      }}
      @media (max-width: 860px) {{
        .metric-grid, .detail-grid, .agent-grid {{ grid-template-columns: 1fr; }}
      }}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <span class="eyebrow">Shared Hermes Verdict</span>
        <h1>{html.escape(query)}</h1>
        <p class="lede">This page exposes a single published session only. It does not provide dashboard or account access.</p>
        <div class="metric-grid">
          <div class="panel">
            <div class="label">Confidence</div>
            <strong>{html.escape(str(confidence))}/100</strong>
          </div>
          <div class="panel">
            <div class="label">Elapsed</div>
            <strong>{html.escape(str(elapsed))}s</strong>
          </div>
          <div class="panel">
            <div class="label">Conflict</div>
            <strong>{html.escape(conflict_text)}</strong>
          </div>
          <div class="panel">
            <div class="label">Visibility</div>
            <strong>Public share</strong>
          </div>
        </div>
        <div class="detail-grid">
          <div class="panel">
            <div class="label">Verdict</div>
            <strong>Arbiter summary</strong>
            <p class="copy">{html.escape(verdict or 'No verdict returned.')}</p>
          </div>
          <div class="panel">
            <div class="label">Key Disagreements</div>
            <strong>{html.escape(conflict_text)}</strong>
            <p class="copy">{html.escape(conflict_summary)}</p>
          </div>
        </div>
        <div class="detail-grid">
          <div class="panel">
            <div class="label">Timestamps</div>
            <strong>{html.escape(timestamp)}</strong>
            <p class="mini">Shared {html.escape(shared_at or 'recently')}</p>
          </div>
          <div class="panel">
            <div class="label">Share Link</div>
            <strong>Public permalink</strong>
            <p class="mini">{html.escape(share_url)}</p>
          </div>
        </div>
        {research_block}
        <div class="agent-grid">
          {''.join(agent_cards)}
        </div>
      </section>
    </main>
  </body>
</html>
"""

    def _average_confidence(self, sessions: list[dict[str, Any]]) -> float:
        scores = [int(session.get('confidence_score', -1)) for session in sessions if int(session.get('confidence_score', -1)) >= 0]
        if not scores:
            return 0.0
        return round(sum(scores) / len(scores), 2)

    def _load_benchmark_summary(self) -> dict[str, Any] | None:
        v0_path = self.root / 'benchmark' / 'results_v0.json'
        v1_path = self.root / 'benchmark' / 'results_v1.json'
        if not v0_path.exists() or not v1_path.exists():
            return None
        v0 = json.loads(v0_path.read_text(encoding='utf-8'))
        v1 = json.loads(v1_path.read_text(encoding='utf-8'))
        confidence_delta = self._pct_change(v0.get('average_confidence', 0.0), v1.get('average_confidence', 0.0))
        quality_delta = self._pct_change(
            v0.get('average_response_quality', 0.0),
            v1.get('average_response_quality', 0.0),
        )
        return {
            'v0_average_confidence': v0.get('average_confidence', 0.0),
            'v1_average_confidence': v1.get('average_confidence', 0.0),
            'v0_average_response_quality': v0.get('average_response_quality', 0.0),
            'v1_average_response_quality': v1.get('average_response_quality', 0.0),
            'confidence_delta_pct': confidence_delta,
            'quality_delta_pct': quality_delta,
            'v0_label': v0.get('label'),
            'v1_label': v1.get('label'),
            'v1_runtime_modes': v1.get('runtime_mode_counts', {}),
            'proof_status': self._benchmark_proof_status(v1),
        }

    def _pct_change(self, before: float, after: float) -> float:
        if before == 0:
            return 0.0
        return round(((after - before) / before) * 100, 2)

    def _benchmark_proof_status(self, v1: dict[str, Any]) -> str:
        runtime_modes = v1.get('runtime_mode_counts', {})
        if not isinstance(runtime_modes, dict) or not runtime_modes:
            return 'unknown'
        if set(runtime_modes.keys()) == {'trained_profile'}:
            return 'learned_profile'
        if set(runtime_modes.keys()) == {'trained_fallback'}:
            return 'fallback_only'
        if 'trained_fallback' in runtime_modes:
            return 'mixed'
        return 'trained_backend'

    def _render_session_markdown(self, session: dict[str, Any]) -> str:
        lines = [
            f"# Hermes Session {session.get('session_id', '')[:8]}",
            '',
            f"**Query:** {session.get('query', '')}",
            f"**Timestamp:** {session.get('timestamp', '')}",
            f"**Confidence:** {session.get('confidence_score', 'n/a')}/100",
            f"**Elapsed:** {session.get('elapsed_seconds', 'n/a')}s",
            f"**Conflict Detected:** {bool(session.get('conflict_detected', False))}",
        ]
        backend = self._arbiter_meta(session).get('backend')
        if backend:
            lines.append(f"**Backend:** {backend}")
        if session.get('skill_path'):
            lines.append(f"**Skill:** {session.get('skill_path')}")
        lines.extend(
            [
                '',
                '## Conflict Summary',
                str(session.get('conflict_summary', '')),
                '',
                '## Verdict',
                str(session.get('arbiter_verdict', '')),
                '',
            ]
        )
        additional_research = str(session.get('additional_research') or '').strip()
        if additional_research:
            lines.extend(['## Additional Research', additional_research, ''])
        lines.append('## Agent Reports')
        for role, response in session.get('agent_responses', {}).items():
            timing = session.get('agent_timings', {}).get(role, {})
            lines.extend(
                [
                    '',
                    f'### {role.title()}',
                    f"- backend: {timing.get('backend', 'unknown')}",
                    f"- duration_seconds: {timing.get('duration_seconds', 'n/a')}",
                    '',
                    str(response),
                ]
            )
        return '\n'.join(lines).strip() + '\n'

    def _arbiter_meta(self, session: dict[str, Any]) -> dict[str, Any]:
        provider_meta = session.get('provider_meta')
        if not isinstance(provider_meta, dict):
            return {}
        arbiter_meta = provider_meta.get('arbiter')
        if not isinstance(arbiter_meta, dict):
            return {}
        return arbiter_meta

    def _render_benchmark_markdown(self) -> str:
        v0_path = self.root / 'benchmark' / 'results_v0.json'
        v1_path = self.root / 'benchmark' / 'results_v1.json'
        if not v0_path.exists() or not v1_path.exists():
            return '# Hermes Benchmark Report\n\nBenchmark files are not available.\n'
        v0 = json.loads(v0_path.read_text(encoding='utf-8'))
        v1 = json.loads(v1_path.read_text(encoding='utf-8'))
        summary = self._load_benchmark_summary() or {}
        lines = [
            '# Hermes Benchmark Report',
            '',
            f"- v0 label: {v0.get('label', 'n/a')}",
            f"- v1 label: {v1.get('label', 'n/a')}",
            f"- proof status: {summary.get('proof_status', 'unknown')}",
            '',
            '| Metric | v0 | v1 | Delta |',
            '| --- | ---: | ---: | ---: |',
            f"| Avg confidence | {v0.get('average_confidence', 0.0)} | {v1.get('average_confidence', 0.0)} | {summary.get('confidence_delta_pct', 0.0)}% |",
            f"| Avg response quality | {v0.get('average_response_quality', 0.0)} | {v1.get('average_response_quality', 0.0)} | {summary.get('quality_delta_pct', 0.0)}% |",
            f"| Avg elapsed seconds | {v0.get('average_elapsed_seconds', 0.0)} | {v1.get('average_elapsed_seconds', 0.0)} | {self._pct_change(v0.get('average_elapsed_seconds', 0.0), v1.get('average_elapsed_seconds', 0.0))}% |",
            '',
            f"- v0 runtime providers: {v0.get('runtime_provider_counts', {})}",
            f"- v1 runtime providers: {v1.get('runtime_provider_counts', {})}",
            f"- v1 runtime modes: {v1.get('runtime_mode_counts', {})}",
            '',
        ]
        return '\n'.join(lines)

    def _resolve_api_key_principal(self, request: web.Request) -> dict[str, Any] | None:
        api_key = request.headers.get('X-API-Key', '').strip()
        if not api_key:
            return None
        record = self.api_key_store.resolve_key(api_key)
        if record is None:
            return None
        user = self.user_store.get_user(record['user_id'])
        if user is None:
            return None
        return {'kind': 'api_key', 'user': user, 'key_id': record['key_id']}

    def _resolve_principal(self, request: web.Request) -> dict[str, Any] | None:
        admin_principal = self._resolve_admin_principal(request)
        if admin_principal is not None:
            return admin_principal
        api_key_principal = self._resolve_api_key_principal(request)
        if api_key_principal is not None:
            return api_key_principal
        return self._resolve_user_principal(request)

    def _require_principal(self, request: web.Request) -> dict[str, Any]:
        principal = self._resolve_principal(request)
        if principal is None:
            raise web.HTTPUnauthorized(text='Missing valid admin token or user session.')
        return principal

    def _resolve_admin_principal(self, request: web.Request) -> dict[str, Any] | None:
        if not self.access_token:
            return None
        auth_header = request.headers.get('Authorization', '')
        candidate = request.headers.get('X-Hermes-Token', '')
        if auth_header.startswith('Bearer '):
            candidate = auth_header[len('Bearer '):].strip()
        if candidate and hmac.compare_digest(candidate, self.access_token):
            return {'kind': 'admin'}
        return None

    def _resolve_user_principal(self, request: web.Request) -> dict[str, Any] | None:
        if self.session_codec is None:
            return None
        token = request.cookies.get(self.settings.web.session_cookie_name, '')
        if not token:
            return None
        identity = self.session_codec.decode(token)
        if identity is None:
            return None
        user = self.user_store.get_user(identity.user_id)
        if user is None:
            return None
        return {'kind': 'user', 'user': user}

    def _csrf_token_for_principal(self, principal: dict[str, Any] | None) -> str | None:
        if not principal or principal.get('kind') != 'user' or self.session_codec is None:
            return None
        user = principal.get('user') or {}
        user_id = str(user.get('user_id') or '').strip()
        if not user_id:
            return None
        return hmac.new(self.session_codec.secret, f'csrf:{user_id}'.encode('utf-8'), 'sha256').hexdigest()

    def _require_csrf_token(self, request: web.Request, principal: dict[str, Any] | None) -> None:
        if not principal or principal.get('kind') != 'user':
            return
        expected = self._csrf_token_for_principal(principal)
        candidate = request.headers.get('X-CSRF-Token', '').strip()
        if not expected or not candidate or not hmac.compare_digest(candidate, expected):
            raise web.HTTPForbidden(text='Missing or invalid CSRF token.')

    async def _enforce_rate_limit(self, principal: dict[str, Any] | None, request: web.Request) -> None:
        if principal is None:
            identity = f"guest:{self._client_identity(request, fallback='anon')}"
            allowed, retry_after = await self.guest_rate_limiter.check(identity)
            if not allowed:
                raise web.HTTPTooManyRequests(
                    text=f'Guest rate limit exceeded. Sign up for more queries. Retry in {retry_after}s.',
                    headers={'Retry-After': str(retry_after)},
                )
            return
        if principal['kind'] == 'api_key':
            identity = f"apikey:{principal['key_id']}"
            allowed, retry_after = await self.api_key_rate_limiter.check(identity)
            if not allowed:
                raise web.HTTPTooManyRequests(
                    text=f'API key rate limit exceeded. Retry in {retry_after} seconds.',
                    headers={'Retry-After': str(retry_after)},
                )
            return
        if principal['kind'] == 'user':
            identity = f"user:{principal['user']['user_id']}"
        else:
            identity = self._client_identity(request, fallback='admin')
        allowed, retry_after = await self.rate_limiter.check(identity)
        if allowed:
            return
        raise web.HTTPTooManyRequests(
            text=f'Rate limit exceeded. Retry in {retry_after} seconds.',
            headers={'Retry-After': str(retry_after)},
        )

    async def _enforce_auth_rate_limit(self, request: web.Request, email: str) -> None:
        identity = f"auth:{self._client_identity(request, fallback='anonymous')}:{sanitize_email(email)[:160]}"
        allowed, retry_after = await self.auth_rate_limiter.check(identity)
        if allowed:
            return
        raise web.HTTPTooManyRequests(
            text=f'Too many authentication attempts. Retry in {retry_after} seconds.',
            headers={'Retry-After': str(retry_after)},
        )

    def _set_user_cookie(self, request: web.Request, response: web.Response, user_id: str) -> None:
        assert self.session_codec is not None
        token = self.session_codec.encode(user_id)
        response.set_cookie(
            self.settings.web.session_cookie_name,
            token,
            httponly=True,
            secure=self._cookie_should_be_secure(request),
            samesite='Strict',
            path='/',
            max_age=self.settings.web.session_ttl_days * 24 * 60 * 60,
        )

    @web.middleware
    async def _security_headers_middleware(self, request: web.Request, handler):
        try:
            response = await handler(request)
        except web.HTTPException as exc:
            response = exc
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('Referrer-Policy', 'same-origin')
        if request.path.startswith('/api/'):
            response.headers.setdefault('Cache-Control', 'no-store')
        if request.path.startswith('/share/'):
            response.headers.setdefault('X-Frame-Options', 'DENY')
            response.headers.setdefault(
                'Content-Security-Policy',
                "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'",
            )
        return response

    def _require_same_origin(self, request: web.Request) -> None:
        origin = request.headers.get('Origin', '').strip()
        referer = request.headers.get('Referer', '').strip()
        if not origin and not referer:
            return
        allowed_origin = self._external_base_url(request)
        if not allowed_origin:
            return
        candidate = origin or referer
        parsed = urlsplit(candidate)
        request_origin = f'{parsed.scheme}://{parsed.netloc}' if parsed.scheme and parsed.netloc else ''
        if request_origin and request_origin == allowed_origin:
            return
        raise web.HTTPForbidden(text='Cross-site request rejected.')

    def _client_identity(self, request: web.Request, fallback: str) -> str:
        forwarded = request.headers.get('X-Forwarded-For', '')
        if forwarded:
            candidate = forwarded.split(',')[0].strip()
            if candidate:
                return candidate[:128]
        if request.remote:
            return str(request.remote)[:128]
        return fallback

    def _cookie_should_be_secure(self, request: web.Request) -> bool:
        public_base_url = (self.settings.web.public_base_url or '').strip().lower()
        return request.secure or public_base_url.startswith('https://')

    def _sanitize_base_url(self, candidate: str) -> str:
        parsed = urlsplit(candidate)
        if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
            return ''
        if parsed.username or parsed.password:
            return ''
        if not re.fullmatch(r'[A-Za-z0-9.\-:\[\]]+', parsed.netloc):
            return ''
        return f'{parsed.scheme}://{parsed.netloc}'

    def _public_agent_timings(self, session: dict[str, Any]) -> dict[str, Any]:
        sanitized: dict[str, Any] = {}
        timings = session.get('agent_timings')
        if not isinstance(timings, dict):
            return sanitized
        for role, timing in timings.items():
            if not isinstance(timing, dict):
                continue
            sanitized[str(role)] = {
                'duration_seconds': timing.get('duration_seconds'),
                'status': timing.get('status'),
            }
        return sanitized



    async def handle_verify_email(self, request: web.Request) -> web.Response:
        token = request.query.get('token', '').strip()
        if not token:
            raise web.HTTPBadRequest(text='Missing verification token.')
        user = self.user_store.verify_email(token)
        if user is None:
            raise web.HTTPBadRequest(text='Invalid or expired verification token.')
        response = web.json_response({'user': user, 'message': 'Email verified successfully.'})
        self._set_user_cookie(request, response, user['user_id'])
        return response

    async def handle_forgot_password(self, request: web.Request) -> web.Response:
        if not self.email_service.enabled:
            raise web.HTTPServiceUnavailable(text='Email service not configured.')
        self._require_same_origin(request)
        payload = await self._read_json(request)
        email = str(payload.get('email') or '').strip()
        await self._enforce_auth_rate_limit(request, email)
        if not is_valid_email(email):
            raise web.HTTPBadRequest(text='Provide a valid email address.')
        token = self.user_store.create_reset_token(email)
        if token:
            self.email_service.send_password_reset_email(email, token)
        return web.json_response({'message': 'If that email exists, a reset link has been sent.'})

    async def handle_reset_password(self, request: web.Request) -> web.Response:
        self._require_same_origin(request)
        payload = await self._read_json(request)
        token = str(payload.get('token') or '').strip()
        password = str(payload.get('password') or '').strip()
        if not token:
            raise web.HTTPBadRequest(text='Missing reset token.')
        password_error = validate_password(password)
        if password_error:
            raise web.HTTPBadRequest(text=password_error)
        success = self.user_store.reset_password(token, password)
        if not success:
            raise web.HTTPBadRequest(text='Invalid or expired reset token.')
        return web.json_response({'message': 'Password reset successfully. You can now log in.'})

    async def handle_create_api_key(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        if principal['kind'] not in ('user', 'admin'):
            raise web.HTTPForbidden(text='API keys can only be created by logged-in users.')
        if principal['kind'] == 'user':
            self._require_same_origin(request)
            self._require_csrf_token(request, principal)
        payload = await self._read_json(request)
        label = str(payload.get('label') or '').strip()
        user_id = principal['user']['user_id'] if principal['kind'] == 'user' else str(payload.get('user_id') or '')
        if not user_id:
            raise web.HTTPBadRequest(text='user_id is required for admin key creation.')
        existing = self.api_key_store.list_keys(user_id)
        if len(existing) >= 5:
            raise web.HTTPConflict(text='Maximum 5 API keys per user.')
        result = self.api_key_store.create_key(user_id=user_id, label=label)
        return web.json_response(result, status=201)

    async def handle_list_api_keys(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        if principal['kind'] == 'user':
            user_id = principal['user']['user_id']
        elif principal['kind'] == 'admin':
            user_id = request.query.get('user_id', '')
            if not user_id:
                raise web.HTTPBadRequest(text='user_id query param required for admin.')
        else:
            raise web.HTTPForbidden(text='Not allowed.')
        keys = self.api_key_store.list_keys(user_id)
        return web.json_response({'keys': keys})

    async def handle_revoke_api_key(self, request: web.Request) -> web.Response:
        principal = self._require_principal(request)
        if principal['kind'] == 'user':
            self._require_same_origin(request)
            self._require_csrf_token(request, principal)
            user_id = principal['user']['user_id']
        elif principal['kind'] == 'admin':
            user_id = request.query.get('user_id', '')
            if not user_id:
                raise web.HTTPBadRequest(text='user_id query param required for admin.')
        else:
            raise web.HTTPForbidden(text='Not allowed.')
        key_id = request.match_info['key_id']
        revoked = self.api_key_store.revoke_key(key_id, user_id)
        if not revoked:
            raise web.HTTPNotFound(text='API key not found or already revoked.')
        return web.json_response({'ok': True, 'key_id': key_id})


async def run_api_server(
    settings: AppSettings,
    orchestrator: MasterOrchestrator,
    host: str = '127.0.0.1',
    port: int = 8000,
) -> None:
    dashboard = HermesWebApp(settings, orchestrator)
    app = dashboard.build_app()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host=host, port=port)
    await site.start()
    print(f'Hermes web app running on http://{host}:{port}')
    try:
        await asyncio.Event().wait()
    finally:
        await runner.cleanup()
