"""Feedback storage for session verdicts — feeds back into the DPO training loop."""

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


class FeedbackStore:
    def __init__(self, root: str = "."):
        self.feedback_dir = Path(root) / "feedback"
        self.feedback_dir.mkdir(parents=True, exist_ok=True)

    def save_feedback(
        self, session_id: str, rating: int, tags: list[str] | None = None
    ) -> dict[str, Any]:
        """Save user feedback for a session. rating: 1 (up) or -1 (down)."""
        if rating not in (1, -1):
            raise ValueError("rating must be 1 or -1")
        clean_tags = [t for t in (tags or []) if t in VALID_TAGS]

        feedback = {
            "session_id": session_id,
            "rating": rating,
            "tags": clean_tags,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        path = self.feedback_dir / f"{session_id}.json"
        path.write_text(json.dumps(feedback, indent=2))
        return feedback

    def get_feedback(self, session_id: str) -> dict[str, Any] | None:
        """Load feedback for a session."""
        path = self.feedback_dir / f"{session_id}.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            return None

    def get_stats(self) -> dict[str, Any]:
        """Aggregate feedback stats across all sessions."""
        total = 0
        positive = 0
        negative = 0
        tag_counts: dict[str, int] = {}

        for path in self.feedback_dir.glob("*.json"):
            try:
                fb = json.loads(path.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            total += 1
            if fb.get("rating", 0) > 0:
                positive += 1
            else:
                negative += 1
            for tag in fb.get("tags", []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

        return {
            "total_rated": total,
            "positive": positive,
            "negative": negative,
            "positive_rate": round(positive / total * 100, 1) if total > 0 else 0,
            "top_tags": sorted(tag_counts.items(), key=lambda x: -x[1])[:5],
        }
