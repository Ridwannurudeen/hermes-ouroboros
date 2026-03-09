from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from core.auth import SessionCodec, validate_password
from core.settings import AppSettings, LearningSettings, ProviderSettings, TelegramSettings, WebSettings
from core.web_app import HermesWebApp


class RequestStub:
    def __init__(self, headers: dict[str, str] | None = None, scheme: str = 'http', secure: bool = False) -> None:
        self.headers = headers or {}
        self.scheme = scheme
        self.secure = secure
        self.remote = '127.0.0.1'


def build_settings(root: Path, public_base_url: str | None = None, auth_secret_env: str = 'HERMES_AUTH_SECRET') -> AppSettings:
    return AppSettings(
        root=root,
        provider=ProviderSettings(
            name='mock',
            model='mock',
            base_url=None,
            api_key_env=None,
            timeout_seconds=30.0,
            temperature=0.0,
        ),
        telegram=TelegramSettings(
            enabled=False,
            bot_token_env='TELEGRAM_BOT_TOKEN',
            allowed_users_env='TELEGRAM_ALLOWED_USERS',
            poll_interval_seconds=1.0,
        ),
        learning=LearningSettings(
            trajectory_dir='trajectories',
            session_dir='sessions',
            models_dir='models',
            base_model='mock',
            auto_train_enabled=False,
            auto_train_min_new_trajectories=50,
        ),
        web=WebSettings(
            token_env='HERMES_WEB_TOKEN',
            rate_limit_requests=12,
            rate_limit_window_seconds=60,
            auth_secret_env=auth_secret_env,
            session_cookie_name='hermes_session',
            session_ttl_days=30,
            public_base_url=public_base_url,
        ),
    )


class WebSecurityTests(unittest.TestCase):
    def test_session_codec_requires_strong_secret(self) -> None:
        with self.assertRaises(ValueError):
            SessionCodec('too-short-secret')

    def test_validate_password_requires_letter_and_number(self) -> None:
        self.assertIsNotNone(validate_password('alllettersxx'))
        self.assertIsNotNone(validate_password('1234567890'))
        self.assertIsNone(validate_password('securepass9'))

    def test_public_share_redacts_internal_fields(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            app = HermesWebApp(build_settings(root), SimpleNamespace(root=root, provider=None))
            request = RequestStub()
            session = {
                'session_id': 'abc123',
                'share_id': 'share-token',
                'query': 'Test query',
                'timestamp': '2026-03-09T00:00:00+00:00',
                'confidence_score': 80,
                'elapsed_seconds': 12.3,
                'conflict_detected': True,
                'conflict_summary': 'Some conflict',
                'arbiter_verdict': 'Verdict text',
                'additional_research': 'Research block',
                'agent_responses': {'advocate': 'A'},
                'agent_timings': {'advocate': {'duration_seconds': 1.2, 'status': 'ok', 'backend': 'modal_http'}},
                'provider_meta': {'arbiter': {'backend': 'modal_http', 'model': 'adapter_v9'}},
                'skill_path': 'skills/auto_secret.md',
            }
            payload = app._public_shared_session(session, request)  # noqa: SLF001
            self.assertNotIn('provider_meta', payload)
            self.assertNotIn('skill_path', payload)
            self.assertEqual(payload['share_url'], '/share/share-token')
            self.assertEqual(payload['agent_timings']['advocate'], {'duration_seconds': 1.2, 'status': 'ok'})

    def test_external_base_url_rejects_invalid_host(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            app = HermesWebApp(build_settings(root), SimpleNamespace(root=root, provider=None))
            request = RequestStub(headers={'Host': 'evil.com\r\nX-Bad: injected'})
            self.assertEqual(app._external_base_url(request), '')  # noqa: SLF001

    def test_csrf_token_is_required_for_user_principals(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            settings = build_settings(root)
            app = HermesWebApp(settings, SimpleNamespace(root=root, provider=None))
            app.session_codec = SessionCodec('x' * 32)
            principal = {'kind': 'user', 'user': {'user_id': 'user-123', 'email': 'user@example.com'}}
            token = app._csrf_token_for_principal(principal)  # noqa: SLF001
            self.assertTrue(token)
            app._require_csrf_token(RequestStub(headers={'X-CSRF-Token': token}), principal)  # noqa: SLF001
            with self.assertRaises(Exception):
                app._require_csrf_token(RequestStub(headers={}), principal)  # noqa: SLF001


if __name__ == '__main__':
    unittest.main()
