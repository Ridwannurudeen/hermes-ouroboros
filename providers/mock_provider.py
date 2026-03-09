from __future__ import annotations

import asyncio
import hashlib
import random
from typing import Mapping

STOPWORDS = {
    'a', 'an', 'and', 'are', 'at', 'best', 'buy', 'current', 'for', 'good',
    'how', 'in', 'is', 'of', 'on', 'or', 'should', 'the', 'to', 'value',
    'what', 'which', 'will', 'with', 'would'
}


def _score(query: str, role: str) -> int:
    digest = hashlib.sha256(f'{role}:{query}'.encode('utf-8')).hexdigest()
    return 60 + (int(digest[:2], 16) % 31)


def _topic_tokens(query: str) -> list[str]:
    cleaned = ''.join(ch if ch.isalnum() or ch.isspace() else ' ' for ch in query)
    tokens = [token for token in cleaned.split() if len(token) > 2 and token.lower() not in STOPWORDS]
    return tokens[:4] or ['the topic']


class MockCouncilProvider:
    """Offline provider that returns role-specific responses for local builds."""

    async def generate(
        self,
        role: str,
        system_prompt: str,
        query: str,
        context: Mapping[str, str] | None = None,
    ) -> str:
        await asyncio.sleep(random.uniform(0.15, 0.55))
        topic = ', '.join(_topic_tokens(query))
        confidence = _score(query, role)
        context = context or {}

        if role == 'advocate':
            return (
                'Key Arguments:\n'
                f'- {topic} has upside when adoption and execution improve.\n'
                '- The proposition can compound if demand, narrative, and distribution align.\n'
                '- In competitive markets, disciplined conviction can outperform indecision.\n\n'
                'Supporting Evidence:\n'
                f'- Positive framing extracted from the query: {query}.\n'
                '- Comparable opportunities usually reward early clarity and momentum.\n'
                '- The upside case strengthens when risk is actively managed.\n\n'
                f'Confidence Level: {confidence}/100'
            )

        if role == 'skeptic':
            return (
                'Key Weaknesses:\n'
                f'- {topic} may already be priced in or overstated.\n'
                '- Hidden dependencies can break the thesis quickly.\n'
                '- Execution risk, market regime changes, and bad incentives remain material.\n\n'
                'Risk Factors:\n'
                f'- Query under review: {query}.\n'
                '- Adverse selection, liquidity stress, and governance failures can invalidate the upside case.\n'
                '- Historical outperformance is not proof of future durability.\n\n'
                f'Confidence Level: {confidence}/100'
            )

        if role == 'oracle':
            return (
                'Known Facts:\n'
                f'- The active investigation is: {query}.\n'
                '- Markets, technologies, and policies change over time; hard claims require current sourcing.\n'
                '- This offline build cannot browse or verify live data.\n\n'
                'Unknown/Uncertain:\n'
                f'- Real-time evidence specific to {topic}.\n'
                '- Counterfactuals, future returns, and unstated assumptions.\n\n'
                'Data Sources:\n'
                '- Current market data, project documentation, and audited third-party research should be consulted.'
            )

        if role == 'contrarian':
            return (
                'Contrarian Position:\n'
                f'- The strongest edge may come from rejecting the obvious reading of {query}.\n\n'
                'Why the Majority May Be Wrong:\n'
                '- Consensus often compresses uncertainty into a single neat story.\n'
                '- The headline thesis can hide second-order effects and structural tradeoffs.\n\n'
                'Alternative Interpretation:\n'
                '- The correct answer may depend less on direction and more on time horizon, incentives, and risk controls.'
            )

        if role == 'researcher':
            summary = context.get('conflict_summary', 'The council disagrees on the central tradeoff.')
            return (
                'Additional Research:\n'
                f'1. Verify the core disputed claim: {summary}.\n'
                '2. Compare recent primary sources instead of commentary.\n'
                '3. Quantify the downside case with concrete thresholds and invalidation points.'
            )

        if role == 'arbiter':
            conflict_summary = context.get('conflict_summary', 'The council is split between upside and risk.')
            research = context.get('additional_research')
            research_block = f'Additional research considered: {research}\n\n' if research else ''
            return (
                'Key Disagreements:\n'
                f'- {conflict_summary}\n'
                '- The upside case depends on execution, while the downside case depends on fragility.\n\n'
                'Verdict:\n'
                'Proceed only if the thesis still holds after current-source verification and explicit risk limits. '
                'The upside is real, but the skeptical case is strong enough that blind conviction is not justified.\n\n'
                f'{research_block}'
                f'Confidence: {confidence}\n\n'
                'Dissenting Views:\n'
                '- The Advocate would size larger and sooner.\n'
                '- The Skeptic would require stricter proof before acting.'
            )

        raise ValueError(f'Unsupported role: {role}')
