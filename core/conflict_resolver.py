from __future__ import annotations

from dataclasses import dataclass

from providers import MockCouncilProvider

POSITIVE_KEYWORDS = {'good', 'strong', 'bullish', 'safe', 'upside', 'opportunity'}
NEGATIVE_KEYWORDS = {'bad', 'weak', 'bearish', 'risky', 'risk', 'fragility'}
RESEARCH_PROMPT = (
    'The following agents disagree. Find 3 additional pieces of evidence '
    'that could resolve this dispute. Be factual and cite sources.'
)


@dataclass
class ConflictResult:
    conflict_detected: bool
    conflict_score: int
    conflict_summary: str
    additional_research: str | None
    additional_research_meta: dict[str, object] | None


class ConflictResolver:
    def __init__(self, provider: object | None = None) -> None:
        self.provider = provider or MockCouncilProvider()

    async def resolve(self, query: str, agent_responses: dict[str, str]) -> ConflictResult:
        advocate = agent_responses.get('advocate', '').lower()
        skeptic = agent_responses.get('skeptic', '').lower()
        advocate_positive = any(word in advocate for word in POSITIVE_KEYWORDS)
        skeptic_negative = any(word in skeptic for word in NEGATIVE_KEYWORDS)
        conflict_detected = advocate_positive and skeptic_negative
        conflict_score = 80 if conflict_detected else 35
        summary = self._build_summary(query, agent_responses, conflict_detected)
        additional_research = None
        if conflict_detected:
            additional_research = await self.provider.generate(
                'researcher',
                RESEARCH_PROMPT,
                query,
                context={'conflict_summary': summary},
            )
            if hasattr(self.provider, 'consume_generation_diagnostics'):
                additional_research_meta = self.provider.consume_generation_diagnostics()
            else:
                additional_research_meta = None
        else:
            additional_research_meta = None
        return ConflictResult(
            conflict_detected=conflict_detected,
            conflict_score=conflict_score,
            conflict_summary=summary,
            additional_research=additional_research,
            additional_research_meta=additional_research_meta,
        )

    def _build_summary(
        self,
        query: str,
        agent_responses: dict[str, str],
        conflict_detected: bool,
    ) -> str:
        if not conflict_detected:
            return f'Agents largely align on the main tradeoffs in: {query}'
        advocate = self._first_signal_line(agent_responses.get('advocate', ''), 'Advocate sees upside.')
        skeptic = self._first_signal_line(agent_responses.get('skeptic', ''), 'Skeptic sees risk.')
        return f'Advocate: {advocate} | Skeptic: {skeptic}'

    def _first_signal_line(self, text: str, default: str) -> str:
        for line in text.splitlines():
            stripped = line.strip().lstrip('-').strip()
            if not stripped or stripped.endswith(':'):
                continue
            if stripped.lower().startswith('confidence'):
                continue
            return stripped
        return default
