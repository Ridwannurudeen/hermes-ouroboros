"""Feedback & Outcome storage for session verdicts.

Supports:
  - Session-level rating (thumbs up/down + tags) — original system
  - Outcome tracking (what actually happened)
  - Claim-level feedback (rate individual claims)
  - Multiple events per session (append, don't overwrite)
  - Free-text notes

All feedback feeds back into the DPO training loop.
"""

import json
import time
from pathlib import Path
from typing import Any


VALID_TAGS = [
    "weak sources",
    "missed counterargument",
    "too confident",
    "too vague",
    "best answer",
    "actionable",
]

VALID_OUTCOMES = [
    "confirmed",
    "refuted",
    "partially_correct",
    "still_pending",
]

VALID_EVENT_TYPES = ["rating", "outcome", "claim_feedback", "note"]


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class FeedbackStore:
    def __init__(self, root: str = "."):
        self.feedback_dir = Path(root) / "feedback"
        self.feedback_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Core read/write
    # ------------------------------------------------------------------

    def _load(self, session_id: str) -> dict[str, Any]:
        path = self.feedback_dir / f"{session_id}.json"
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding='utf-8'))
                # Migrate legacy format (no events list)
                if 'events' not in data:
                    data['events'] = []
                    if data.get('rating'):
                        data['events'].append({
                            'type': 'rating',
                            'timestamp': data.get('timestamp', _now_iso()),
                            'rating': data['rating'],
                            'tags': data.get('tags', []),
                        })
                return data
            except (json.JSONDecodeError, OSError):
                pass
        return {'session_id': session_id, 'events': []}

    def _save(self, session_id: str, data: dict[str, Any]) -> None:
        path = self.feedback_dir / f"{session_id}.json"
        path.write_text(json.dumps(data, indent=2), encoding='utf-8')

    # ------------------------------------------------------------------
    # Rating (backward-compatible)
    # ------------------------------------------------------------------

    def save_feedback(
        self, session_id: str, rating: int, tags: list[str] | None = None
    ) -> dict[str, Any]:
        """Save user rating for a session. rating: 1 (up) or -1 (down)."""
        if rating not in (1, -1):
            raise ValueError("rating must be 1 or -1")
        clean_tags = [t for t in (tags or []) if t in VALID_TAGS]

        data = self._load(session_id)
        event = {
            'type': 'rating',
            'timestamp': _now_iso(),
            'rating': rating,
            'tags': clean_tags,
        }
        data['events'].append(event)

        # Maintain legacy top-level fields
        data['session_id'] = session_id
        data['rating'] = rating
        data['tags'] = clean_tags
        data['timestamp'] = event['timestamp']

        self._save(session_id, data)
        return data

    # ------------------------------------------------------------------
    # Outcome tracking
    # ------------------------------------------------------------------

    def record_outcome(
        self, session_id: str, outcome: str, note: str = ''
    ) -> dict[str, Any]:
        """Record what actually happened — was the verdict right?"""
        if outcome not in VALID_OUTCOMES:
            raise ValueError(f"outcome must be one of: {', '.join(VALID_OUTCOMES)}")

        data = self._load(session_id)
        event = {
            'type': 'outcome',
            'timestamp': _now_iso(),
            'outcome': outcome,
            'note': note[:500],
        }
        data['events'].append(event)
        data['latest_outcome'] = outcome

        self._save(session_id, data)
        return data

    # ------------------------------------------------------------------
    # Claim-level feedback
    # ------------------------------------------------------------------

    def record_claim_feedback(
        self,
        session_id: str,
        claim_id: str,
        claim_text: str,
        outcome: str,
        note: str = '',
    ) -> dict[str, Any]:
        """Record feedback on an individual claim."""
        if outcome not in ('confirmed', 'refuted', 'pending'):
            raise ValueError("claim outcome must be: confirmed, refuted, or pending")

        data = self._load(session_id)
        event = {
            'type': 'claim_feedback',
            'timestamp': _now_iso(),
            'claim_id': claim_id,
            'claim_text': claim_text[:300],
            'outcome': outcome,
            'note': note[:500],
        }
        data['events'].append(event)

        # Maintain claim feedback index
        claim_outcomes = data.get('claim_outcomes', {})
        claim_outcomes[claim_id] = outcome
        data['claim_outcomes'] = claim_outcomes

        self._save(session_id, data)
        return data

    # ------------------------------------------------------------------
    # Notes
    # ------------------------------------------------------------------

    def add_note(self, session_id: str, text: str) -> dict[str, Any]:
        """Add a free-text note to a session."""
        if not text.strip():
            raise ValueError("note text cannot be empty")

        data = self._load(session_id)
        event = {
            'type': 'note',
            'timestamp': _now_iso(),
            'text': text.strip()[:1000],
        }
        data['events'].append(event)

        self._save(session_id, data)
        return data

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    def get_feedback(self, session_id: str) -> dict[str, Any] | None:
        """Load full feedback record for a session."""
        path = self.feedback_dir / f"{session_id}.json"
        if not path.exists():
            return None
        data = self._load(session_id)
        return data if data.get('events') else None

    def get_stats(self) -> dict[str, Any]:
        """Aggregate feedback stats across all sessions."""
        total = 0
        positive = 0
        negative = 0
        tag_counts: dict[str, int] = {}
        outcome_counts: dict[str, int] = {}
        claim_feedback_count = 0
        notes_count = 0

        for path in self.feedback_dir.glob("*.json"):
            try:
                data = json.loads(path.read_text(encoding='utf-8'))
            except (json.JSONDecodeError, OSError):
                continue

            events = data.get('events', [])
            if not events:
                # Legacy format
                total += 1
                if data.get("rating", 0) > 0:
                    positive += 1
                else:
                    negative += 1
                for tag in data.get("tags", []):
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
                continue

            last_rating = None
            for ev in events:
                ev_type = ev.get('type')
                if ev_type == 'rating':
                    last_rating = ev
                    for tag in ev.get('tags', []):
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
                elif ev_type == 'outcome':
                    oc = ev.get('outcome', 'unknown')
                    outcome_counts[oc] = outcome_counts.get(oc, 0) + 1
                elif ev_type == 'claim_feedback':
                    claim_feedback_count += 1
                elif ev_type == 'note':
                    notes_count += 1

            total += 1
            if last_rating is not None:
                if last_rating.get('rating', 0) > 0:
                    positive += 1
                else:
                    negative += 1

        return {
            "total_rated": total,
            "positive": positive,
            "negative": negative,
            "positive_rate": round(positive / total * 100, 1) if total > 0 else 0,
            "top_tags": sorted(tag_counts.items(), key=lambda x: -x[1])[:5],
            "outcome_counts": outcome_counts,
            "claim_feedback_count": claim_feedback_count,
            "notes_count": notes_count,
        }
