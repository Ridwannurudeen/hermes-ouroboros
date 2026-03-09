from __future__ import annotations

from typing import Mapping


MAX_REPORT_CHARS = 900
MAX_RESEARCH_CHARS = 600


def build_arbiter_prompt(
    query: str,
    agent_responses: Mapping[str, str],
    additional_research: str | None = None,
    max_report_chars: int = MAX_REPORT_CHARS,
    max_research_chars: int = MAX_RESEARCH_CHARS,
) -> str:
    research_block = ''
    if additional_research:
        research_block = f'\nADDITIONAL RESEARCH:\n{_trim_block(additional_research, max_research_chars)}\n'
    return (
        f'QUERY: {query}\n\n'
        f"ADVOCATE REPORT:\n{_trim_block(agent_responses.get('advocate', ''), max_report_chars)}\n\n"
        f"SKEPTIC REPORT:\n{_trim_block(agent_responses.get('skeptic', ''), max_report_chars)}\n\n"
        f"ORACLE REPORT:\n{_trim_block(agent_responses.get('oracle', ''), max_report_chars)}\n\n"
        f"CONTRARIAN REPORT:\n{_trim_block(agent_responses.get('contrarian', ''), max_report_chars)}\n"
        f'{research_block}\n'
        'Your task: Review all four reports and render your verdict.\n'
        'Respond using this exact structure:\n'
        'Key Disagreements:\n'
        'Evidence Weighing:\n'
        'Final Verdict:\n'
        'Confidence Score: <0-100>\n'
        'Dissenting Views:\n'
        'Use the full 0-100 confidence scale. If the evidence clearly supports one answer, do not default to 70.'
    )


def _trim_block(text: str, max_chars: int) -> str:
    cleaned = ' '.join(str(text or '').split())
    if len(cleaned) <= max_chars:
        return cleaned
    clipped = cleaned[:max_chars].rsplit(' ', 1)[0].rstrip()
    return f'{clipped} ...'
