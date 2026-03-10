from __future__ import annotations

import hashlib
import json
import secrets
import time
from pathlib import Path
from typing import Any


class ApiKeyStore:
    """Manages developer API keys stored in users/api_keys.json."""

    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.keys_path = self.root / 'users' / 'api_keys.json'
        self.keys_path.parent.mkdir(parents=True, exist_ok=True)

    def create_key(self, user_id: str, label: str = '') -> dict[str, Any]:
        raw_key = f'ho_{secrets.token_urlsafe(32)}'
        key_hash = self._hash_key(raw_key)
        key_id = secrets.token_urlsafe(12)
        record = {
            'key_id': key_id,
            'user_id': user_id,
            'key_hash': key_hash,
            'key_prefix': raw_key[:12],
            'label': (label or '').strip()[:80],
            'created_at': time.time(),
            'last_used_at': None,
            'queries': 0,
            'revoked': False,
        }
        keys = self._read_keys()
        keys[key_id] = record
        self._write_keys(keys)
        return {'key_id': key_id, 'api_key': raw_key, 'label': record['label'], 'key_prefix': record['key_prefix']}

    def list_keys(self, user_id: str) -> list[dict[str, Any]]:
        keys = self._read_keys()
        result = []
        for record in keys.values():
            if record.get('user_id') != user_id or record.get('revoked'):
                continue
            result.append({
                'key_id': record['key_id'],
                'key_prefix': record.get('key_prefix', ''),
                'label': record.get('label', ''),
                'created_at': record.get('created_at'),
                'last_used_at': record.get('last_used_at'),
                'queries': record.get('queries', 0),
            })
        result.sort(key=lambda x: x.get('created_at') or 0, reverse=True)
        return result

    def revoke_key(self, key_id: str, user_id: str) -> bool:
        keys = self._read_keys()
        record = keys.get(key_id)
        if record is None or record.get('user_id') != user_id:
            return False
        record['revoked'] = True
        self._write_keys(keys)
        return True

    def resolve_key(self, raw_key: str) -> dict[str, Any] | None:
        """Validate a raw API key and return the associated record, or None."""
        key_hash = self._hash_key(raw_key)
        keys = self._read_keys()
        for record in keys.values():
            if record.get('revoked'):
                continue
            if record.get('key_hash') == key_hash:
                record['last_used_at'] = time.time()
                record['queries'] = record.get('queries', 0) + 1
                self._write_keys(keys)
                return record
        return None

    def _hash_key(self, raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()

    def _read_keys(self) -> dict[str, dict[str, Any]]:
        if not self.keys_path.exists():
            return {}
        try:
            data = json.loads(self.keys_path.read_text(encoding='utf-8'))
            if isinstance(data, dict):
                return data
        except (json.JSONDecodeError, OSError):
            pass
        return {}

    def _write_keys(self, keys: dict[str, dict[str, Any]]) -> None:
        self.keys_path.write_text(json.dumps(keys, indent=2), encoding='utf-8')
