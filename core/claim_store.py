"""Persistent Claim Store — canonical IDs, state history, linked sessions.

Each unique claim gets a canonical ID derived from its normalized text.
Every time the same claim appears in a new session, the store links
the session and records the status assigned by the arbiter.  This lets
us track how a claim's credibility evolves across analyses.

Storage layout:
  claims/
    index.json          — {canonical_id → claim record}
    by_session.json     — {session_id → [canonical_id, ...]}
"""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class ClaimStore:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.claims_dir = self.root / 'claims'
        self.claims_dir.mkdir(parents=True, exist_ok=True)
        self._index_path = self.claims_dir / 'index.json'
        self._by_session_path = self.claims_dir / 'by_session.json'
        self._index: dict[str, dict[str, Any]] = self._load_json(self._index_path)
        self._by_session: dict[str, list[str]] = self._load_json(self._by_session_path)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def index_session_claims(self, session_result: dict[str, Any]) -> list[str]:
        """Index all claims from a session result.  Returns list of canonical IDs."""
        session_id = session_result.get('session_id', '')
        timestamp = session_result.get('timestamp', datetime.now(timezone.utc).isoformat())
        query = session_result.get('query', '')
        hermes_score = session_result.get('hermes_score', -1)
        claims = session_result.get('claim_breakdown') or []

        if not claims or not session_id:
            return []

        canonical_ids: list[str] = []
        for claim_item in claims:
            claim_text = claim_item.get('claim', '').strip()
            if not claim_text or len(claim_text) < 10:
                continue

            cid = self._canonical_id(claim_text)
            canonical_ids.append(cid)

            if cid not in self._index:
                # New claim — create record
                self._index[cid] = {
                    'canonical_id': cid,
                    'text': claim_text,
                    'normalized': self._normalize(claim_text),
                    'first_seen': timestamp,
                    'last_seen': timestamp,
                    'sessions': [],
                    'status_history': [],
                    'evidence': {
                        'for': [],
                        'against': [],
                    },
                    'latest_status': claim_item.get('status', 'insufficient_evidence'),
                    'appearances': 0,
                }

            record = self._index[cid]
            record['last_seen'] = timestamp
            record['appearances'] = record.get('appearances', 0) + 1
            record['latest_status'] = claim_item.get('status', record.get('latest_status'))

            # Link session
            if session_id not in record['sessions']:
                record['sessions'].append(session_id)

            # Append status history entry
            record['status_history'].append({
                'session_id': session_id,
                'status': claim_item.get('status', 'insufficient_evidence'),
                'timestamp': timestamp,
                'query': query[:200],
                'hermes_score': hermes_score,
                'uncertainty': claim_item.get('uncertainty'),
            })

            # Merge evidence (deduplicate)
            for ef in claim_item.get('evidence_for', []):
                if ef and ef not in record['evidence']['for']:
                    record['evidence']['for'].append(ef)
            for ea in claim_item.get('evidence_against', []):
                if ea and ea not in record['evidence']['against']:
                    record['evidence']['against'].append(ea)

        # Update session → claims mapping
        existing = set(self._by_session.get(session_id, []))
        existing.update(canonical_ids)
        self._by_session[session_id] = list(existing)

        self._save()
        return canonical_ids

    def get_claim(self, canonical_id: str) -> dict[str, Any] | None:
        """Get a single claim record by canonical ID."""
        return self._index.get(canonical_id)

    def get_session_claims(self, session_id: str) -> list[dict[str, Any]]:
        """Get all claim records linked to a session."""
        cids = self._by_session.get(session_id, [])
        return [self._index[cid] for cid in cids if cid in self._index]

    def search_claims(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        """Search claims by text content."""
        query_lower = query.lower()
        results = []
        for record in self._index.values():
            if query_lower in record.get('normalized', ''):
                results.append(record)
                if len(results) >= limit:
                    break
        # Sort by appearances (most seen first)
        results.sort(key=lambda r: r.get('appearances', 0), reverse=True)
        return results

    def get_recurring_claims(self, min_appearances: int = 2, limit: int = 20) -> list[dict[str, Any]]:
        """Get claims that appear across multiple sessions."""
        recurring = [
            r for r in self._index.values()
            if r.get('appearances', 0) >= min_appearances
        ]
        recurring.sort(key=lambda r: r.get('appearances', 0), reverse=True)
        return recurring[:limit]

    def get_stats(self) -> dict[str, Any]:
        """Aggregate statistics from the claim store."""
        total = len(self._index)
        if total == 0:
            return {
                'total_claims': 0,
                'unique_sessions': 0,
                'recurring_claims': 0,
                'status_breakdown': {},
                'avg_appearances': 0,
            }

        status_counts: dict[str, int] = {}
        total_appearances = 0
        recurring = 0

        for record in self._index.values():
            status = record.get('latest_status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
            appearances = record.get('appearances', 1)
            total_appearances += appearances
            if appearances >= 2:
                recurring += 1

        return {
            'total_claims': total,
            'unique_sessions': len(self._by_session),
            'recurring_claims': recurring,
            'status_breakdown': status_counts,
            'avg_appearances': round(total_appearances / total, 2) if total else 0,
        }

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _canonical_id(self, text: str) -> str:
        """Generate a stable canonical ID from claim text."""
        normalized = self._normalize(text)
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:16]

    @staticmethod
    def _normalize(text: str) -> str:
        """Normalize claim text for deduplication."""
        # Lowercase, strip accents, collapse whitespace, remove punctuation
        text = text.lower().strip()
        text = unicodedata.normalize('NFKD', text)
        text = ''.join(c for c in text if not unicodedata.combining(c))
        text = re.sub(r'[^\w\s]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _load_json(self, path: Path) -> dict:
        """Load JSON file, return empty dict if missing/corrupt."""
        if path.exists():
            try:
                return json.loads(path.read_text(encoding='utf-8'))
            except (json.JSONDecodeError, OSError):
                pass
        return {}

    def _save(self) -> None:
        """Persist index and session mapping to disk."""
        self._index_path.write_text(
            json.dumps(self._index, indent=2, default=str),
            encoding='utf-8',
        )
        self._by_session_path.write_text(
            json.dumps(self._by_session, indent=2, default=str),
            encoding='utf-8',
        )
