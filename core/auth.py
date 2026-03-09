from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode('ascii').rstrip('=')


def _b64url_decode(value: str) -> bytes:
    padding = '=' * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f'scrypt${_b64url_encode(salt)}${_b64url_encode(derived)}'


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt_b64, hash_b64 = stored_hash.split('$', 2)
    except ValueError:
        return False
    if algorithm != 'scrypt':
        return False
    salt = _b64url_decode(salt_b64)
    expected = _b64url_decode(hash_b64)
    derived = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=2**14, r=8, p=1, dklen=len(expected))
    return hmac.compare_digest(derived, expected)


@dataclass(frozen=True)
class SessionIdentity:
    user_id: str
    expires_at: int


class SessionCodec:
    def __init__(self, secret: str, ttl_days: int = 30) -> None:
        if len(secret.encode('utf-8')) < 32:
            raise ValueError('HERMES_AUTH_SECRET must be at least 32 bytes.')
        self.secret = secret.encode('utf-8')
        self.ttl_seconds = ttl_days * 24 * 60 * 60

    def encode(self, user_id: str) -> str:
        payload = {
            'uid': user_id,
            'exp': int(time.time()) + self.ttl_seconds,
        }
        payload_b64 = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
        signature = _b64url_encode(hmac.new(self.secret, payload_b64.encode('utf-8'), hashlib.sha256).digest())
        return f'{payload_b64}.{signature}'

    def decode(self, token: str) -> SessionIdentity | None:
        try:
            payload_b64, signature = token.split('.', 1)
        except ValueError:
            return None
        expected_signature = _b64url_encode(
            hmac.new(self.secret, payload_b64.encode('utf-8'), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(signature, expected_signature):
            return None
        try:
            payload = json.loads(_b64url_decode(payload_b64).decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
        user_id = str(payload.get('uid') or '').strip()
        expires_at = int(payload.get('exp') or 0)
        if not user_id or expires_at < int(time.time()):
            return None
        return SessionIdentity(user_id=user_id, expires_at=expires_at)


def sanitize_email(value: str) -> str:
    return value.strip().lower()


def is_valid_email(value: str) -> bool:
    candidate = sanitize_email(value)
    if '@' not in candidate or candidate.startswith('@') or candidate.endswith('@'):
        return False
    local, _, domain = candidate.partition('@')
    return bool(local and domain and '.' in domain)


def validate_password(password: str) -> str | None:
    if len(password) < 10:
        return 'Password must be at least 10 characters.'
    if password.strip() != password:
        return 'Password cannot start or end with spaces.'
    if not re.search(r'[A-Za-z]', password):
        return 'Password must include at least one letter.'
    if not re.search(r'\d', password):
        return 'Password must include at least one number.'
    return None
