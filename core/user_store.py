from __future__ import annotations

import json
import secrets
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.auth import hash_password, sanitize_email, verify_password


class UserStore:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.users_dir = self.root / 'users'
        self.users_dir.mkdir(parents=True, exist_ok=True)
        self.users_path = self.users_dir / 'users.json'

    def create_user(self, email: str, password: str) -> dict[str, Any]:
        normalized_email = sanitize_email(email)
        users = self._read_users()
        if any(item.get('email') == normalized_email for item in users.values()):
            raise ValueError('An account with that email already exists.')

        user_id = str(uuid.uuid4())
        verification_token = secrets.token_urlsafe(32)
        user = {
            'user_id': user_id,
            'email': normalized_email,
            'password_hash': hash_password(password),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'verified': False,
            'verification_token': verification_token,
            'verification_token_expires': time.time() + 86400,
        }
        users[user_id] = user
        self._write_users(users)
        result = self._public_user(user)
        result['verification_token'] = verification_token
        return result


    def verify_email(self, token: str) -> dict[str, Any] | None:
        users = self._read_users()
        for user in users.values():
            if user.get('verification_token') != token:
                continue
            expires = user.get('verification_token_expires', 0)
            if time.time() > expires:
                return None
            user['verified'] = True
            user.pop('verification_token', None)
            user.pop('verification_token_expires', None)
            self._write_users(users)
            return self._public_user(user)
        return None

    def create_reset_token(self, email: str) -> str | None:
        normalized_email = sanitize_email(email)
        users = self._read_users()
        for user in users.values():
            if user.get('email') != normalized_email:
                continue
            token = secrets.token_urlsafe(32)
            user['reset_token'] = token
            user['reset_token_expires'] = time.time() + 3600
            self._write_users(users)
            return token
        return None

    def reset_password(self, token: str, new_password: str) -> bool:
        users = self._read_users()
        for user in users.values():
            if user.get('reset_token') != token:
                continue
            expires = user.get('reset_token_expires', 0)
            if time.time() > expires:
                return False
            user['password_hash'] = hash_password(new_password)
            user.pop('reset_token', None)
            user.pop('reset_token_expires', None)
            self._write_users(users)
            return True
        return False

    def authenticate(self, email: str, password: str) -> dict[str, Any] | None:
        normalized_email = sanitize_email(email)
        users = self._read_users()
        for user in users.values():
            if user.get('email') != normalized_email:
                continue
            if verify_password(password, str(user.get('password_hash') or '')):
                return self._public_user(user)
            return None
        return None

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        users = self._read_users()
        user = users.get(user_id)
        if user is None:
            return None
        return self._public_user(user)

    def _read_users(self) -> dict[str, dict[str, Any]]:
        if not self.users_path.exists():
            return {}
        data = json.loads(self.users_path.read_text(encoding='utf-8'))
        if not isinstance(data, dict):
            return {}
        return {str(key): value for key, value in data.items() if isinstance(value, dict)}

    def _write_users(self, users: dict[str, dict[str, Any]]) -> None:
        self.users_path.write_text(json.dumps(users, indent=2), encoding='utf-8')

    def _public_user(self, user: dict[str, Any]) -> dict[str, Any]:
        return {
            'user_id': user.get('user_id'),
            'email': user.get('email'),
            'created_at': user.get('created_at'),
            'verified': user.get('verified', True),
        }
