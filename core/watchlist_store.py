"""Watchlist — living claim monitoring system.

Lets users "watch" canonical claims and track their evolution over time.
Connects to the claim store for state history and drift detection.

Storage: watchlist/watched.json — {canonical_id → watch record}
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class WatchlistStore:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.watchlist_dir = self.root / 'watchlist'
        self.watchlist_dir.mkdir(parents=True, exist_ok=True)
        self._path = self.watchlist_dir / 'watched.json'
        self._data: dict[str, dict[str, Any]] = self._load()

    # ------------------------------------------------------------------
    # Watch / Unwatch
    # ------------------------------------------------------------------

    def watch(
        self,
        claim_id: str,
        claim_text: str = '',
        current_status: str = '',
        current_score: int | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Start watching a claim."""
        if claim_id in self._data:
            return self._data[claim_id]

        record: dict[str, Any] = {
            'claim_id': claim_id,
            'claim_text': claim_text[:300],
            'watched_at': _now_iso(),
            'user_id': user_id,
            'initial_status': current_status,
            'latest_status': current_status,
            'initial_score': current_score,
            'latest_score': current_score,
            'last_checked': _now_iso(),
            'change_count': 0,
            'changes': [],
        }
        self._data[claim_id] = record
        self._save()
        return record

    def unwatch(self, claim_id: str) -> bool:
        """Stop watching a claim."""
        if claim_id in self._data:
            del self._data[claim_id]
            self._save()
            return True
        return False

    def is_watched(self, claim_id: str) -> bool:
        return claim_id in self._data

    # ------------------------------------------------------------------
    # Update from claim store
    # ------------------------------------------------------------------

    def refresh_from_claim_store(self, claim_store: Any) -> list[dict[str, Any]]:
        """Check all watched claims against the claim store for changes.

        Returns list of claims that changed since last check.
        """
        changed = []
        for claim_id, watch in self._data.items():
            record = claim_store.get_claim(claim_id)
            if record is None:
                continue

            new_status = record.get('latest_status', '')
            appearances = record.get('appearances', 0)
            last_seen = record.get('last_seen', '')

            old_status = watch.get('latest_status', '')
            status_changed = new_status != old_status and old_status

            if status_changed:
                change_entry = {
                    'timestamp': _now_iso(),
                    'from_status': old_status,
                    'to_status': new_status,
                    'appearances': appearances,
                    'trigger_session': record['sessions'][-1] if record.get('sessions') else None,
                }
                watch['changes'].append(change_entry)
                watch['change_count'] = len(watch['changes'])
                watch['latest_status'] = new_status
                changed.append({
                    'claim_id': claim_id,
                    'claim_text': watch['claim_text'],
                    **change_entry,
                })

            # Always update metadata
            watch['last_checked'] = _now_iso()
            watch['latest_status'] = new_status
            watch['appearances'] = appearances
            watch['last_seen'] = last_seen

            # Derive score from latest status history entry
            if record.get('status_history'):
                latest_entry = record['status_history'][-1]
                watch['latest_score'] = latest_entry.get('hermes_score')

        self._save()
        return changed

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    def list_watched(self, user_id: str | None = None) -> list[dict[str, Any]]:
        """List all watched claims."""
        items = list(self._data.values())
        if user_id:
            items = [i for i in items if i.get('user_id') == user_id]
        # Sort by most recently changed first, then by watch date
        items.sort(key=lambda i: i.get('last_checked', ''), reverse=True)
        return items

    def get_watched(self, claim_id: str) -> dict[str, Any] | None:
        """Get a single watched claim with its change history."""
        return self._data.get(claim_id)

    def get_stats(self) -> dict[str, Any]:
        """Summary stats for the watchlist."""
        total = len(self._data)
        changed = sum(1 for w in self._data.values() if w.get('change_count', 0) > 0)
        status_counts: dict[str, int] = {}
        for w in self._data.values():
            s = w.get('latest_status', 'unknown')
            status_counts[s] = status_counts.get(s, 0) + 1
        return {
            'total_watched': total,
            'claims_with_changes': changed,
            'status_breakdown': status_counts,
        }

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _load(self) -> dict[str, dict[str, Any]]:
        if self._path.exists():
            try:
                return json.loads(self._path.read_text(encoding='utf-8'))
            except (json.JSONDecodeError, OSError):
                pass
        return {}

    def _save(self) -> None:
        self._path.write_text(
            json.dumps(self._data, indent=2, default=str),
            encoding='utf-8',
        )
