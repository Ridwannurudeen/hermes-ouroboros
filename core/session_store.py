from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class SessionStore:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.sessions_dir = self.root / 'sessions'
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

    def save_session(self, session_result: dict[str, Any]) -> Path:
        session_id = session_result['session_id']
        destination = self.sessions_dir / f'{session_id}.json'
        destination.write_text(json.dumps(session_result, indent=2), encoding='utf-8')
        return destination

    def get_recent_sessions(
        self,
        n: int = 10,
        owner_user_id: str | None = None,
        query_text: str | None = None,
        backend_filter: str | None = None,
        conflict_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        files = sorted(self.sessions_dir.glob('*.json'), key=lambda path: path.stat().st_mtime, reverse=True)
        sessions: list[dict[str, Any]] = []
        normalized_query = (query_text or '').strip().lower()
        normalized_backend = (backend_filter or '').strip().lower()
        normalized_conflict = (conflict_filter or '').strip().lower()
        for path in files:
            session = json.loads(path.read_text(encoding='utf-8'))
            if owner_user_id and session.get('owner_user_id') != owner_user_id:
                continue
            if normalized_query and normalized_query not in str(session.get('query', '')).lower():
                continue
            backend = str(self._arbiter_meta(session).get('backend', '')).lower()
            if normalized_backend and normalized_backend not in {'all', backend}:
                if normalized_backend == 'openai' and backend == 'openai':
                    pass
                elif normalized_backend == 'trained_fallback' and backend.startswith('trained_fallback'):
                    pass
                elif normalized_backend == 'mock' and 'mock' in backend:
                    pass
                else:
                    continue
            if normalized_conflict in {'conflict', 'aligned'}:
                conflict_detected = bool(session.get('conflict_detected'))
                if normalized_conflict == 'conflict' and not conflict_detected:
                    continue
                if normalized_conflict == 'aligned' and conflict_detected:
                    continue
            sessions.append(session)
            if len(sessions) >= n:
                break
        return sessions

    def get_session(self, session_id: str, owner_user_id: str | None = None) -> dict[str, Any] | None:
        path = self.sessions_dir / f'{session_id}.json'
        if not path.exists():
            return None
        session = json.loads(path.read_text(encoding='utf-8'))
        if owner_user_id and session.get('owner_user_id') != owner_user_id:
            return None
        return session

    def attach_owner(self, session_id: str, user_id: str, email: str) -> dict[str, Any] | None:
        path = self.sessions_dir / f'{session_id}.json'
        if not path.exists():
            return None
        session = json.loads(path.read_text(encoding='utf-8'))
        session['owner_user_id'] = user_id
        session['owner_email'] = email
        path.write_text(json.dumps(session, indent=2), encoding='utf-8')
        return session

    def create_share(self, session_id: str, owner_user_id: str | None = None) -> dict[str, Any] | None:
        path = self.sessions_dir / f'{session_id}.json'
        if not path.exists():
            return None
        session = json.loads(path.read_text(encoding='utf-8'))
        if owner_user_id and session.get('owner_user_id') != owner_user_id:
            return None
        if not session.get('share_id'):
            session['share_id'] = secrets.token_urlsafe(12)
            session['shared_at'] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(session, indent=2), encoding='utf-8')
        return session

    def revoke_share(self, session_id: str, owner_user_id: str | None = None) -> dict[str, Any] | None:
        path = self.sessions_dir / f'{session_id}.json'
        if not path.exists():
            return None
        session = json.loads(path.read_text(encoding='utf-8'))
        if owner_user_id and session.get('owner_user_id') != owner_user_id:
            return None
        session.pop('share_id', None)
        session.pop('shared_at', None)
        path.write_text(json.dumps(session, indent=2), encoding='utf-8')
        return session

    def get_shared_session(self, share_id: str) -> dict[str, Any] | None:
        if not share_id:
            return None
        for path in self.sessions_dir.glob('*.json'):
            session = json.loads(path.read_text(encoding='utf-8'))
            if session.get('share_id') == share_id:
                return session
        return None

    def _arbiter_meta(self, session: dict[str, Any]) -> dict[str, Any]:
        provider_meta = session.get('provider_meta')
        if not isinstance(provider_meta, dict):
            return {}
        arbiter_meta = provider_meta.get('arbiter')
        if not isinstance(arbiter_meta, dict):
            return {}
        return arbiter_meta
