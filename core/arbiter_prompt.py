from __future__ import annotations

from typing import Mapping

from core.mode_prompts import MODE_AGENT_LABELS


MAX_REPORT_CHARS = 900
MAX_RESEARCH_CHARS = 600

# Report labels per mode — falls back to default role names
_DEFAULT_LABELS = {
    'advocate': 'ADVOCATE',
    'skeptic': 'SKEPTIC',
    'oracle': 'ORACLE',
    'contrarian': 'CONTRARIAN',
}


def build_arbiter_prompt(
    query: str,
    agent_responses: Mapping[str, str],
    additional_research: str | None = None,
    max_report_chars: int = MAX_REPORT_CHARS,
    max_research_chars: int = MAX_RESEARCH_CHARS,
    analysis_mode: str = 'default',
    round2_responses: Mapping[str, str] | None = None,
) -> str:
    mode_labels = MODE_AGENT_LABELS.get(analysis_mode, _DEFAULT_LABELS)
    research_block = ''
    if additional_research:
        research_block = f'\nADDITIONAL RESEARCH:\n{_trim_block(additional_research, max_research_chars)}\n'

    parts = [f'QUERY: {query}\n']
    for role in ('advocate', 'skeptic', 'oracle', 'contrarian'):
        label = mode_labels.get(role, role.upper())
        text = agent_responses.get(role, '')
        parts.append(f'{label.upper()} REPORT:\n{_trim_block(text, max_report_chars)}\n')

    if round2_responses:
        parts.append('--- ROUND 2 REBUTTALS ---\n')
        for role in ('advocate', 'skeptic', 'oracle', 'contrarian'):
            label = mode_labels.get(role, role.upper())
            text = round2_responses.get(role, '')
            if text:
                parts.append(f'{label.upper()} REBUTTAL:\n{_trim_block(text, max_report_chars)}\n')

    parts.append(research_block)
    parts.append(
        'Your task: Review all reports (and rebuttals if present) and render your verdict.\n'
        'Use the exact structure specified in your system prompt.\n'
        'Use the full 0-100 scale. If the evidence clearly supports one answer, do not default to 70.'
    )
    return '\n'.join(parts)


def _trim_block(text: str, max_chars: int) -> str:
    cleaned = ' '.join(str(text or '').split())
    if len(cleaned) <= max_chars:
        return cleaned
    clipped = cleaned[:max_chars].rsplit(' ', 1)[0].rstrip()
    return f'{clipped} ...'
