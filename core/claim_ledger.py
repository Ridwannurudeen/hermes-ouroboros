"""Claim Ledger — aggregate claim statistics across all sessions."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def build_claim_ledger(sessions_dir: Path, max_recent: int = 20) -> dict[str, Any]:
    """Scan all sessions and aggregate claim statistics."""
    total_claims = 0
    status_counts: dict[str, int] = {}
    total_sessions = 0
    sessions_with_claims = 0
    recent_claims: list[dict[str, Any]] = []

    paths = sorted(
        sessions_dir.glob('*.json'),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    for path in paths:
        try:
            session = json.loads(path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            continue

        total_sessions += 1
        claims = session.get('claim_breakdown') or []
        if not claims:
            continue

        sessions_with_claims += 1
        for claim in claims:
            total_claims += 1
            status = claim.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1

            if len(recent_claims) < max_recent:
                recent_claims.append({
                    'claim': (claim.get('claim', '') or '')[:200],
                    'status': status,
                    'session_id': session.get('session_id', ''),
                    'query': (session.get('query', '') or '')[:100],
                    'timestamp': session.get('timestamp', ''),
                    'hermes_score': session.get('hermes_score', -1),
                })

    return {
        'total_claims': total_claims,
        'total_sessions': total_sessions,
        'sessions_with_claims': sessions_with_claims,
        'status_breakdown': status_counts,
        'supported_pct': round(
            status_counts.get('supported', 0) / total_claims * 100, 1
        ) if total_claims > 0 else 0,
        'disputed_pct': round(
            status_counts.get('disputed', 0) / total_claims * 100, 1
        ) if total_claims > 0 else 0,
        'recent_claims': recent_claims,
    }
