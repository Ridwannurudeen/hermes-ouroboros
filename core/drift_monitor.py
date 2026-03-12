"""Verdict Drift Monitor — track how Hermes answers evolve over time.

Compares the current session to similar past sessions, revealing score
changes, verdict label shifts, and claim evolution.  Tracks whether the
DPO self-improvement loop is producing measurable differences.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

_STOP_WORDS = frozenset({
    'the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'were',
    'been', 'have', 'has', 'had', 'not', 'but', 'from', 'they', 'will',
    'can', 'would', 'could', 'should', 'what', 'when', 'how', 'which',
    'who', 'does', 'did', 'its', 'you', 'your', 'our', 'their', 'about',
    'into', 'than', 'then', 'also', 'more', 'some', 'very', 'just',
})


def _normalize(text: str) -> set[str]:
    """Extract meaningful words for similarity comparison."""
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    return {w for w in words if w not in _STOP_WORDS}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _count_claim_statuses(claims: list | None) -> dict[str, int]:
    if not claims:
        return {}
    counts: dict[str, int] = {}
    for claim in claims:
        status = claim.get('status', 'unknown')
        counts[status] = counts.get(status, 0) + 1
    return counts


def _build_drift_entry(similarity: float, session: dict[str, Any]) -> dict[str, Any]:
    vs = session.get('verdict_sections') or {}
    return {
        'session_id': session.get('session_id', ''),
        'timestamp': session.get('timestamp', ''),
        'query': session.get('query', ''),
        'similarity': round(similarity, 3),
        'hermes_score': session.get('hermes_score', -1),
        'confidence_score': session.get('confidence_score', -1),
        'verdict_label': vs.get('verdict_label', ''),
        'analysis_mode': session.get('analysis_mode', 'default'),
        'claim_count': len(session.get('claim_breakdown') or []),
        'claim_statuses': _count_claim_statuses(session.get('claim_breakdown')),
    }


def find_similar_sessions(
    query: str,
    current_session_id: str,
    sessions_dir: Path,
    min_similarity: float = 0.35,
    max_results: int = 5,
) -> list[dict[str, Any]]:
    """Find past sessions with similar queries."""
    query_words = _normalize(query)
    if not query_words:
        return []

    candidates: list[tuple[float, dict[str, Any]]] = []
    for path in sessions_dir.glob('*.json'):
        try:
            session = json.loads(path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            continue

        sid = session.get('session_id', '')
        if sid == current_session_id:
            continue

        past_query = session.get('query', '')
        if not past_query:
            continue

        sim = _jaccard(query_words, _normalize(past_query))
        if sim >= min_similarity:
            candidates.append((sim, session))

    candidates.sort(key=lambda x: x[0], reverse=True)
    return [_build_drift_entry(sim, s) for sim, s in candidates[:max_results]]


def build_drift_analysis(
    current_session: dict[str, Any],
    sessions_dir: Path,
) -> dict[str, Any] | None:
    """Build full drift analysis comparing current session to similar past sessions."""
    query = current_session.get('query', '')
    session_id = current_session.get('session_id', '')

    similar = find_similar_sessions(query, session_id, sessions_dir)
    if not similar:
        return None

    closest = similar[0]
    current_score = current_session.get('hermes_score', -1)
    past_score = closest.get('hermes_score', -1)
    current_vs = current_session.get('verdict_sections') or {}
    current_label = current_vs.get('verdict_label', '')
    past_label = closest.get('verdict_label', '')

    score_delta = (current_score - past_score) if current_score >= 0 and past_score >= 0 else None
    label_changed = bool(current_label and past_label and current_label != past_label)

    return {
        'has_drift': True,
        'similar_sessions': similar,
        'closest_match': {
            'session_id': closest['session_id'],
            'query': closest['query'],
            'timestamp': closest['timestamp'],
            'similarity': closest['similarity'],
        },
        'score_delta': score_delta,
        'score_direction': (
            'improved' if score_delta and score_delta > 0
            else 'declined' if score_delta and score_delta < 0
            else 'stable'
        ),
        'current_score': current_score,
        'past_score': past_score,
        'label_changed': label_changed,
        'current_label': current_label,
        'past_label': past_label,
        'current_claims': len(current_session.get('claim_breakdown') or []),
        'past_claims': closest.get('claim_count', 0),
    }
