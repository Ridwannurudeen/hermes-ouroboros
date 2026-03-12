"""Parse structured fields from arbiter verdict text.

The mode-specific arbiter prompts ask for sections like HERMES SCORE,
THINKING TRAPS, BLIND SPOTS, PREMORTEM, etc.  This module extracts them
into a dict so the frontend can render them individually.
"""
from __future__ import annotations

import re
from typing import Any


# Sections we look for in verdict text.  Key = output field name,
# value = regex pattern that captures everything after the header.
_SECTION_PATTERNS: list[tuple[str, str]] = [
    ('verdict_label', r'VERDICT\s*[:=]\s*(?:\[([A-Z /]+?)\]|([A-Z][A-Z /]+?)(?:\s*[\(\n\—\-]|\s{2,}))'),
    ('hermes_score', r'HERMES\s+SCORE\s*[:=]\s*\[?\s*(\d{1,3})\s*\]?'),
    ('confidence', r'CONFIDENCE\s*[:=]\s*\[?\s*(\d{1,3})\s*\]?'),
    ('survival_probability', r'SURVIVAL\s+PROBABILITY\s*[:=]\s*\[?\s*(\d{1,3})\s*\]?'),
    ('failure_probability', r'PROBABILITY\s+OF\s+FAILURE\s*[:=]\s*\[?\s*(\d{1,3})\s*\]?'),
    ('factual_accuracy', r'FACTUAL\s+ACCURACY\s*[:=]\s*\[?\s*(\d{1,3})\s*\]?'),
    ('misleading_factor', r'MISLEADING\s+FACTOR\s*[:=]\s*\[?\s*(\d{1,3})\s*\]?'),
]

# Free-text sections: extract everything between the header and the next header
_TEXT_SECTIONS: list[tuple[str, str]] = [
    ('fatal_flaws', r'FATAL\s+FLAWS?\s*[:=]\s*'),
    ('key_strengths', r'KEY\s+STRENGTHS?\s*[:=]\s*'),
    ('fix_or_die', r'FIX\s+OR\s+DIE\s*[:=]\s*'),
    ('thinking_traps', r'THINKING\s+TRAPS?\s*[:=]\s*'),
    ('blind_spots', r'BLIND\s+SPOTS?\s*[:=]\s*'),
    ('premortem', r'PREMORTEM\s*[:=]\s*'),
    ('action_items', r'SO\s+WHAT\s*[—\-]+\s*(?:DO\s+THIS\s+NOW|THE\s+BOTTOM\s+LINE|RECOMMENDED\s+ACTION)\s*[:=]\s*'),
    ('key_evidence_for', r'KEY\s+EVIDENCE\s+FOR\s*[:=]\s*'),
    ('key_evidence_against', r'KEY\s+EVIDENCE\s+AGAINST\s*[:=]\s*'),
    ('missing_context', r'MISSING\s+CONTEXT\s*[:=]\s*'),
    ('source_credibility', r'SOURCE\s+CREDIBILITY\s*[:=]\s*'),
    ('bull_case_summary', r'BULL\s+CASE\s+SUMMARY\s*[:=]\s*'),
    ('bear_case_summary', r'BEAR\s+CASE\s+SUMMARY\s*[:=]\s*'),
    ('key_uncertainties', r'KEY\s+UNCERTAINTIES\s*[:=]\s*'),
    ('dissenting_views', r'DISSENTING\s+VIEWS?\s*[:=]\s*'),
    ('what_would_change', r'WHAT\s+WOULD\s+CHANGE\s+(?:THIS\s+)?(?:VERDICT|ASSESSMENT|ANALYSIS)\s*[:=]\s*'),
]

# Headers that mark the start of a new section (used to find boundaries)
_ALL_HEADERS = re.compile(
    r'^(?:VERDICT|HERMES\s+SCORE|CONFIDENCE|FATAL\s+FLAW|KEY\s+STRENGTH|FIX\s+OR\s+DIE|'
    r'THINKING\s+TRAP|BLIND\s+SPOT|PREMORTEM|SO\s+WHAT|KEY\s+EVIDENCE|MISSING\s+CONTEXT|'
    r'SOURCE\s+CREDIB|BULL\s+CASE\s+SUMM|BEAR\s+CASE\s+SUMM|KEY\s+UNCERTAIN|'
    r'DISSENTING|WHAT\s+WOULD\s+CHANGE|SURVIVAL\s+PROB|PROBABILITY\s+OF|FACTUAL\s+ACC|MISLEADING)\s*[:=]',
    re.IGNORECASE | re.MULTILINE,
)


def parse_verdict(verdict: str) -> dict[str, Any]:
    """Extract structured sections from arbiter verdict text."""
    result: dict[str, Any] = {}

    # Numeric / label sections
    for field, pattern in _SECTION_PATTERNS:
        match = re.search(pattern, verdict, re.IGNORECASE)
        if match:
            # Pick the first non-None group (some patterns have alternation with multiple groups)
            val = next((g for g in match.groups() if g is not None), '').strip()
            if not val:
                continue
            if field in ('hermes_score', 'confidence', 'survival_probability',
                         'failure_probability', 'factual_accuracy', 'misleading_factor'):
                try:
                    result[field] = min(int(val), 100)
                except ValueError:
                    result[field] = val
            else:
                result[field] = val

    # Free-text sections
    for field, pattern in _TEXT_SECTIONS:
        match = re.search(pattern, verdict, re.IGNORECASE)
        if match:
            start = match.end()
            # Find the next section header after this one
            rest = verdict[start:]
            next_header = _ALL_HEADERS.search(rest)
            if next_header:
                text = rest[:next_header.start()]
            else:
                text = rest
            cleaned = text.strip()
            if cleaned:
                result[field] = cleaned

    return result
