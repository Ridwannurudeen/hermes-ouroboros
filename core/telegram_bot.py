from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aiohttp

from core.master_orchestrator import MasterOrchestrator
from core.runtime_router import RuntimeRouter
from core.settings import AppSettings, env_value, parse_allowed_users
from core.telegram_delivery import TelegramDelivery


class TelegramBotRunner:
    def __init__(self, settings: AppSettings, orchestrator: MasterOrchestrator) -> None:
        self.settings = settings
        self.orchestrator = orchestrator
        self.delivery = TelegramDelivery()
        self.bot_token = env_value(settings.telegram.bot_token_env)
        self.allowed_users = parse_allowed_users(env_value(settings.telegram.allowed_users_env))
        self.offset = 0
        self.root = Path(orchestrator.root)
        self.logs_dir = self.root / 'logs'
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.updates_log = self.logs_dir / 'telegram_updates.log'
        self.users_json = self.logs_dir / 'telegram_users.json'
        self.runtime = RuntimeRouter(settings, orchestrator)

    async def run_forever(self) -> None:
        if not self.bot_token:
            raise RuntimeError(
                f'Telegram is enabled but env var {self.settings.telegram.bot_token_env} is not set.'
            )

        async with aiohttp.ClientSession() as session:
            while True:
                updates = await self._get_updates(session)
                for update in updates:
                    self.offset = max(self.offset, update['update_id'] + 1)
                    await self._handle_update(session, update)
                await asyncio.sleep(self.settings.telegram.poll_interval_seconds)

    async def _get_updates(self, session: aiohttp.ClientSession) -> list[dict[str, Any]]:
        payload = {'offset': self.offset, 'timeout': 30}
        async with session.get(self._url('getUpdates'), params=payload, timeout=35) as response:
            response.raise_for_status()
            body = await response.json()
            return body.get('result', [])

    async def _handle_update(self, session: aiohttp.ClientSession, update: dict[str, Any]) -> None:
        message = update.get('message') or {}
        text = (message.get('text') or '').strip()
        chat = message.get('chat') or {}
        from_user = message.get('from') or {}
        chat_id = chat.get('id')
        user_id = from_user.get('id')
        username = from_user.get('username') or ''

        if not chat_id or not text:
            return

        self._log_update(user_id, chat_id, username, text)
        if self.allowed_users and user_id not in self.allowed_users:
            await self._send_message(session, chat_id, 'Unauthorized user.')
            return

        if text in {'/help', '/start'}:
            await self._send_message(
                session,
                chat_id,
                'Hermes Ouroboros is a multi-agent council bot. Send any question for a fast verdict, use /trained <question> for the trained council path, /status for recent sessions, and /id to see your Telegram user ID.',
            )
            return

        if text == '/id':
            await self._send_message(session, chat_id, f'Your Telegram user ID is {user_id}.')
            return

        if text.startswith('/trained'):
            query = text[len('/trained'):].strip()
            if not query:
                await self._send_message(session, chat_id, 'Usage: /trained <question>')
                return
            await self._send_message(
                session,
                chat_id,
                'Trained council convened. Hermes will use the trained path when available and automatically fall back to the local v1 profile if needed.',
            )
            result, runtime_meta = await self.runtime.run_query(query, mode='trained')
            fallback_reason = runtime_meta.get('fallback_reason')
            if runtime_meta.get('mode') == 'trained_fallback' and fallback_reason:
                await self._send_message(
                    session,
                    chat_id,
                    f'{fallback_reason} Falling back to the local v1 trained profile now.',
                )
            await self._send_message(session, chat_id, self.delivery.format_primary_message(result))
            await self._send_message(session, chat_id, self.delivery.format_follow_up_message(result))
            return

        if text == '/status':
            sessions = self.orchestrator.session_store.get_recent_sessions(n=3)
            if not sessions:
                await self._send_message(session, chat_id, 'No sessions recorded yet.')
                return
            lines = [
                f"{session['session_id'][:8]} | confidence={session['confidence_score']} | {session['query']}"
                for session in sessions
            ]
            await self._send_message(session, chat_id, '\n'.join(lines))
            return

        await self._send_message(session, chat_id, 'Council convened. 5 agents dispatched...')
        result, _ = await self.runtime.run_query(text, mode='default')
        await self._send_message(session, chat_id, self.delivery.format_primary_message(result))
        await self._send_message(session, chat_id, self.delivery.format_follow_up_message(result))

    async def _send_message(self, session: aiohttp.ClientSession, chat_id: int | str, text: str) -> None:
        payload = {'chat_id': str(chat_id), 'text': text}
        async with session.post(self._url('sendMessage'), data=payload, timeout=30) as response:
            response.raise_for_status()
            await response.read()

    def _url(self, method: str) -> str:
        return f'https://api.telegram.org/bot{self.bot_token}/{method}'

    def _log_update(self, user_id: int | None, chat_id: int | None, username: str, text: str) -> None:
        entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'user_id': user_id,
            'chat_id': chat_id,
            'username': username,
            'text': text,
        }
        with self.updates_log.open('a', encoding='utf-8') as handle:
            handle.write(json.dumps(entry) + '\n')

        users: dict[str, dict[str, object]] = {}
        if self.users_json.exists():
            users = json.loads(self.users_json.read_text(encoding='utf-8'))
        if user_id is not None:
            users[str(user_id)] = {
                'chat_id': chat_id,
                'username': username,
                'last_text': text,
                'last_seen': entry['timestamp'],
            }
            self.users_json.write_text(json.dumps(users, indent=2), encoding='utf-8')
