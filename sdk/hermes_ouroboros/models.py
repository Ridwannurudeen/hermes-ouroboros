"""Data models for HERMES SDK responses."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Verdict:
    """Structured result from a HERMES council deliberation.

    Attributes:
        score: The HERMES score (0-100). Higher means more true/viable.
        label: Verdict label, e.g. "STRONG TRUE", "FATAL FLAW", "MOSTLY TRUE".
        summary: First 500 characters of the arbiter verdict.
        confidence: Confidence score (0-100) for the verdict.
        agent_responses: Dict mapping agent role to its full response text.
        web_evidence: Web evidence gathered during analysis, if any.
        session_id: Unique session identifier for this query.
        raw: The complete raw API response dict for advanced usage.
    """

    score: int
    label: str
    summary: str
    confidence: int
    agent_responses: Dict[str, str]
    web_evidence: Optional[Dict[str, Any]]
    session_id: str
    raw: Dict[str, Any] = field(repr=False)

    @property
    def full_verdict(self) -> str:
        """The complete arbiter verdict text (untruncated)."""
        return self.raw.get("arbiter_verdict", self.summary)

    @property
    def verdict_sections(self) -> Dict[str, Any]:
        """Parsed verdict sections (fatal_flaws, thinking_traps, etc.)."""
        return self.raw.get("verdict_sections", {})

    @property
    def query(self) -> str:
        """The original query that was analyzed."""
        return self.raw.get("query", "")

    @property
    def analysis_mode(self) -> str:
        """The analysis mode used (verify, red_team, research)."""
        return self.raw.get("analysis_mode", "default")

    def __repr__(self) -> str:
        return f"Verdict(score={self.score}, label={self.label!r})"

    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> Verdict:
        """Build a Verdict from the API result dict.

        The API returns ``{"result": {...}, "runtime": {...}}``.
        Pass the inner ``result`` dict here.
        """
        arbiter_verdict: str = data.get("arbiter_verdict", "")
        sections: Dict[str, Any] = data.get("verdict_sections", {})

        score = data.get("hermes_score", -1)
        if score == -1 and "hermes_score" in sections:
            score = sections["hermes_score"]

        label = sections.get("verdict_label", "UNKNOWN")

        confidence = data.get("confidence_score", -1)
        if confidence == -1 and "confidence" in sections:
            confidence = sections["confidence"]

        summary = arbiter_verdict[:500] if arbiter_verdict else ""

        return cls(
            score=score,
            label=label,
            summary=summary,
            confidence=confidence,
            agent_responses=data.get("agent_responses", {}),
            web_evidence=data.get("web_evidence"),
            session_id=data.get("session_id", ""),
            raw=data,
        )
