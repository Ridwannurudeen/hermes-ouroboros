from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from core.master_orchestrator import MasterOrchestrator
from core.settings import AppSettings
from learning.model_swapper import ModelSwapper
from providers.factory import build_provider


class RuntimeRouter:
    def __init__(self, settings: AppSettings, orchestrator: MasterOrchestrator) -> None:
        self.settings = settings
        self.orchestrator = orchestrator
        self.root = Path(orchestrator.root)
        self._orchestrator_cache: dict[str, MasterOrchestrator] = {}
        self._trained_backend_retry_at: datetime | None = None
        self._trained_backend_reason: str | None = None

    async def run_query(self, query: str, mode: str = 'default', stream_callback=None) -> tuple[dict[str, Any], dict[str, Any]]:
        normalized_mode = mode.strip().lower()
        if normalized_mode == 'trained':
            return await self._run_trained_query(query, stream_callback=stream_callback)

        result = await self.orchestrator.run_query(query, stream_callback=stream_callback)
        return result, {
            'mode': 'default',
            'provider': type(self.orchestrator.provider).__name__,
            'fallback_reason': None,
        }

    async def _run_trained_query(self, query: str, stream_callback=None) -> tuple[dict[str, Any], dict[str, Any]]:
        latest_target = self._latest_trained_target()
        if latest_target and latest_target.get('provider') == 'learned_profile':
            profile_orchestrator = self._get_orchestrator('learned_profile', self.settings.provider.model)
            result = await profile_orchestrator.run_query(query, stream_callback=stream_callback)
            return result, {
                'mode': 'trained_profile',
                'provider': type(profile_orchestrator.provider).__name__,
                'fallback_reason': None,
            }

        fallback_reason = self._trained_backend_status()
        trained_orchestrator: MasterOrchestrator | None = None

        if fallback_reason is None:
            try:
                trained_orchestrator = self._get_orchestrator('modal_http', 'active')
            except Exception as exc:
                fallback_reason = f'Trained Modal backend unavailable: {exc}'

        if fallback_reason is None and trained_orchestrator is not None:
            result = await trained_orchestrator.run_query(query, stream_callback=stream_callback)
            trained_error = self._trained_error_message(result)
            if trained_error is None:
                self._clear_trained_backend_status()
                return result, {
                    'mode': 'trained_modal',
                    'provider': type(trained_orchestrator.provider).__name__,
                    'fallback_reason': None,
                }
            fallback_reason = trained_error

        if fallback_reason is None:
            fallback_reason = 'Trained council is temporarily unavailable. Falling back to the local v1 profile.'
        self._mark_trained_backend_unavailable(fallback_reason)

        fallback_orchestrator = self._get_orchestrator('trained_fallback', self.settings.provider.model)
        result = await fallback_orchestrator.run_query(query, stream_callback=stream_callback)
        return result, {
            'mode': 'trained_fallback',
            'provider': type(fallback_orchestrator.provider).__name__,
            'fallback_reason': fallback_reason,
        }

    def _get_orchestrator(self, provider_name: str, model_name: str) -> MasterOrchestrator:
        cache_key = f'{provider_name}:{model_name}'
        cached = self._orchestrator_cache.get(cache_key)
        if cached is not None:
            return cached

        provider_settings = replace(
            self.settings.provider,
            name=provider_name,
            model=model_name,
        )
        override_settings = replace(self.settings, provider=provider_settings)
        provider = build_provider(override_settings)
        orchestrator = MasterOrchestrator(root=self.root, provider=provider)
        self._orchestrator_cache[cache_key] = orchestrator
        return orchestrator

    def _trained_error_message(self, result: dict[str, Any]) -> str | None:
        verdict = str(result.get('arbiter_verdict', ''))
        lowered = verdict.lower()
        if 'spend limit reached' in lowered:
            return (
                'Trained council is temporarily unavailable because the Modal workspace spend limit has been reached.'
            )
        if 'too many requests' in lowered or '429' in lowered:
            return 'Trained council is temporarily unavailable because the Modal inference endpoint is rate-limited right now.'
        if verdict.startswith('[ERROR]'):
            return 'Trained council is temporarily unavailable right now.'
        return None

    def _trained_backend_status(self) -> str | None:
        if self._trained_backend_retry_at is None or self._trained_backend_reason is None:
            return None
        if datetime.now(timezone.utc) >= self._trained_backend_retry_at:
            self._clear_trained_backend_status()
            return None
        return self._trained_backend_reason

    def _mark_trained_backend_unavailable(self, reason: str) -> None:
        retry_minutes = 60 if 'spend limit' in reason.lower() else 15
        self._trained_backend_reason = reason
        self._trained_backend_retry_at = datetime.now(timezone.utc) + timedelta(minutes=retry_minutes)

    def _clear_trained_backend_status(self) -> None:
        self._trained_backend_reason = None
        self._trained_backend_retry_at = None

    def _latest_trained_target(self) -> dict[str, Any] | None:
        try:
            swapper = ModelSwapper(self.root)
            version = swapper.get_active_version()
            return swapper.get_inference_target(version)
        except Exception:
            return None
