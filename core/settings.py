from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


@dataclass(frozen=True)
class ProviderSettings:
    name: str
    model: str
    base_url: str | None
    api_key_env: str | None
    timeout_seconds: float
    temperature: float


@dataclass(frozen=True)
class TelegramSettings:
    enabled: bool
    bot_token_env: str
    allowed_users_env: str
    poll_interval_seconds: float


@dataclass(frozen=True)
class LearningSettings:
    trajectory_dir: str
    session_dir: str
    models_dir: str
    base_model: str
    auto_train_enabled: bool
    auto_train_min_new_trajectories: int


@dataclass(frozen=True)
class WebSettings:
    token_env: str
    rate_limit_requests: int
    rate_limit_window_seconds: int
    auth_secret_env: str
    session_cookie_name: str
    session_ttl_days: int
    public_base_url: str | None


@dataclass(frozen=True)
class AppSettings:
    root: Path
    provider: ProviderSettings
    telegram: TelegramSettings
    learning: LearningSettings
    web: WebSettings


def load_settings(root: str | Path = '.') -> AppSettings:
    root_path = Path(root).resolve()
    if load_dotenv is not None:
        load_dotenv(root_path / '.env', override=False)

    config_path = root_path / 'config.yaml'
    raw = _read_yaml(config_path)
    provider_raw = raw.get('provider', {})
    telegram_raw = raw.get('telegram', {})
    learning_raw = raw.get('learning', {})
    web_raw = raw.get('web', {})

    if isinstance(provider_raw, str):
        provider_raw = {'name': provider_raw}

    provider_name = os.getenv('HERMES_PROVIDER', provider_raw.get('name', 'mock'))
    model = os.getenv('HERMES_MODEL', provider_raw.get('model', raw.get('model', 'hermes-3-llama-3.1-8b')))

    provider = ProviderSettings(
        name=provider_name,
        model=model,
        base_url=os.getenv('HERMES_BASE_URL', provider_raw.get('base_url')),
        api_key_env=provider_raw.get('api_key_env', 'OPENAI_API_KEY'),
        timeout_seconds=float(os.getenv('HERMES_TIMEOUT_SECONDS', provider_raw.get('timeout_seconds', 120))),
        temperature=float(os.getenv('HERMES_TEMPERATURE', provider_raw.get('temperature', 0.2))),
    )
    telegram = TelegramSettings(
        enabled=_as_bool(os.getenv('TELEGRAM_ENABLED', telegram_raw.get('enabled', False))),
        bot_token_env=telegram_raw.get('bot_token_env', 'TELEGRAM_BOT_TOKEN'),
        allowed_users_env=telegram_raw.get('allowed_users_env', 'TELEGRAM_ALLOWED_USERS'),
        poll_interval_seconds=float(telegram_raw.get('poll_interval_seconds', 1.0)),
    )
    learning = LearningSettings(
        trajectory_dir=learning_raw.get('trajectory_dir', 'trajectories'),
        session_dir=learning_raw.get('session_dir', 'sessions'),
        models_dir=learning_raw.get('models_dir', 'models'),
        base_model=os.getenv(
            'TRAINING_BASE_MODEL',
            learning_raw.get('base_model', 'NousResearch/Hermes-3-Llama-3.1-8B'),
        ),
        auto_train_enabled=_as_bool(
            os.getenv('HERMES_AUTO_TRAIN_ENABLED', learning_raw.get('auto_train_enabled', False))
        ),
        auto_train_min_new_trajectories=int(
            os.getenv(
                'HERMES_AUTO_TRAIN_MIN_NEW_TRAJECTORIES',
                learning_raw.get('auto_train_min_new_trajectories', 50),
            )
        ),
    )
    web = WebSettings(
        token_env=web_raw.get('token_env', 'HERMES_WEB_TOKEN'),
        rate_limit_requests=int(os.getenv('HERMES_WEB_RATE_LIMIT_REQUESTS', web_raw.get('rate_limit_requests', 12))),
        rate_limit_window_seconds=int(
            os.getenv('HERMES_WEB_RATE_LIMIT_WINDOW_SECONDS', web_raw.get('rate_limit_window_seconds', 60))
        ),
        auth_secret_env=web_raw.get('auth_secret_env', 'HERMES_AUTH_SECRET'),
        session_cookie_name=os.getenv(
            'HERMES_SESSION_COOKIE_NAME',
            web_raw.get('session_cookie_name', 'hermes_session'),
        ),
        session_ttl_days=int(os.getenv('HERMES_SESSION_TTL_DAYS', web_raw.get('session_ttl_days', 30))),
        public_base_url=os.getenv('HERMES_PUBLIC_BASE_URL', web_raw.get('public_base_url')),
    )
    return AppSettings(root=root_path, provider=provider, telegram=telegram, learning=learning, web=web)


def env_value(name: str | None) -> str | None:
    if not name:
        return None
    return os.getenv(name)


def parse_allowed_users(raw: str | None) -> set[int]:
    if not raw:
        return set()
    users: set[int] = set()
    for item in raw.split(','):
        item = item.strip()
        if not item:
            continue
        try:
            users.add(int(item))
        except ValueError:
            continue
    return users


def _read_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding='utf-8')) or {}
    if not isinstance(data, dict):
        return {}
    return data


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return bool(value)
