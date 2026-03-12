"""
DPO Preference Extractor
========================
Converts council debate sessions into Direct Preference Optimization (DPO)
training pairs.

The Arbiter's verdict is the natural preference signal: agent responses that
align with the verdict are "chosen"; those that were explicitly dismissed or
contradicted are "rejected".

This is the DPO loop's core insight:
  every council session generates free preference data.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


# Minimum confidence for a session to yield reliable preference pairs.
MIN_CONFIDENCE_FOR_DPO = 70

# Minimum character length for a response to be usable as a DPO example.
MIN_RESPONSE_LENGTH = 150

# Roles ranked by their typical "alignment with truth" tendency.
# Advocate and Skeptic are one-sided by design; Oracle is calibrated;
# Arbiter is the ground truth.
ALIGNED_ROLES = {'oracle', 'advocate'}
ADVERSARIAL_ROLES = {'skeptic', 'contrarian'}


def extract_preference_pairs(session: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Given a completed council session, return a list of DPO training pairs.

    Each pair has the form:
      {
        "prompt": str,          # the original user query
        "chosen": str,          # response that aligned with the verdict
        "rejected": str,        # response that was overruled or contradicted
        "chosen_role": str,
        "rejected_role": str,
        "session_id": str,
        "confidence_score": int,
        "source": "dpo_preference"
      }
    """
    confidence = int(session.get('confidence_score', -1))
    if confidence < MIN_CONFIDENCE_FOR_DPO:
        return []

    query = str(session.get('query', '')).strip()
    if not query:
        return []

    arbiter_verdict = str(session.get('arbiter_verdict', '')).strip()
    if not arbiter_verdict:
        return []

    agent_responses: dict[str, str] = session.get('agent_responses', {}) or {}
    if len(agent_responses) < 2:
        return []

    # Determine which agent responses align with the arbiter verdict.
    aligned, contradicted = _classify_agent_responses(
        arbiter_verdict, agent_responses
    )

    pairs: list[dict[str, Any]] = []
    session_id = str(session.get('session_id', ''))

    # Pair each aligned response against each contradicted one.
    for chosen_role, chosen_text in aligned.items():
        for rejected_role, rejected_text in contradicted.items():
            if (len(chosen_text) < MIN_RESPONSE_LENGTH
                    or len(rejected_text) < MIN_RESPONSE_LENGTH):
                continue
            pairs.append({
                'prompt': query,
                'chosen': chosen_text,
                'rejected': rejected_text,
                'chosen_role': chosen_role,
                'rejected_role': rejected_role,
                'session_id': session_id,
                'confidence_score': confidence,
                'arbiter_verdict_excerpt': arbiter_verdict[:300],
                'source': 'dpo_preference',
            })

    # Also treat the arbiter verdict itself as a "chosen" response paired
    # against the weakest agent output. This trains the model to produce
    # Arbiter-quality synthesis.
    weakest_role, weakest_text = _find_weakest_response(agent_responses, arbiter_verdict)
    if weakest_text and len(weakest_text) >= MIN_RESPONSE_LENGTH:
        pairs.append({
            'prompt': _build_arbiter_prompt_excerpt(query, agent_responses),
            'chosen': arbiter_verdict,
            'rejected': weakest_text,
            'chosen_role': 'arbiter',
            'rejected_role': weakest_role,
            'session_id': session_id,
            'confidence_score': confidence,
            'arbiter_verdict_excerpt': arbiter_verdict[:300],
            'source': 'dpo_arbiter_vs_agent',
        })

    return pairs


def extract_pairs_from_sessions_dir(sessions_dir: str | Path) -> list[dict[str, Any]]:
    """Load all session JSON files and extract DPO pairs from high-quality ones."""
    path = Path(sessions_dir)
    all_pairs: list[dict[str, Any]] = []
    for session_path in sorted(path.glob('*.json')):
        try:
            session = json.loads(session_path.read_text(encoding='utf-8'))
            pairs = extract_preference_pairs(session)
            all_pairs.extend(pairs)
        except Exception:  # noqa: BLE001
            continue
    return all_pairs


def build_dpo_dataset(root: str | Path = '.') -> list[dict[str, Any]]:
    """Build the full DPO dataset from all sessions."""
    root_path = Path(root)
    return extract_pairs_from_sessions_dir(root_path / 'sessions')


def save_dpo_dataset(root: str | Path = '.', output_name: str = 'dpo_pairs.json') -> Path:
    """Extract DPO pairs and save to the trajectories directory."""
    root_path = Path(root)
    pairs = build_dpo_dataset(root_path)
    output_path = root_path / 'trajectories' / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(pairs, indent=2), encoding='utf-8')
    return output_path


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _classify_agent_responses(
    arbiter_verdict: str,
    agent_responses: dict[str, str],
) -> tuple[dict[str, str], dict[str, str]]:
    """
    Classify each agent response as aligned with or contradicted by the
    arbiter verdict.

    Strategy:
    - Extract key terms from the arbiter's final verdict section.
    - Score each agent response by overlap with those terms.
    - Top half → aligned; bottom half → contradicted.
    """
    verdict_terms = _extract_verdict_terms(arbiter_verdict)

    scores: dict[str, float] = {}
    for role, text in agent_responses.items():
        if not text or len(text) < MIN_RESPONSE_LENGTH:
            scores[role] = 0.0
            continue
        scores[role] = _term_overlap_score(text.lower(), verdict_terms)

    if not scores:
        return {}, {}

    sorted_roles = sorted(scores, key=scores.__getitem__, reverse=True)
    midpoint = max(1, len(sorted_roles) // 2)

    aligned = {r: agent_responses[r] for r in sorted_roles[:midpoint] if r in agent_responses}
    contradicted = {r: agent_responses[r] for r in sorted_roles[midpoint:] if r in agent_responses}

    return aligned, contradicted


def _extract_verdict_terms(arbiter_verdict: str) -> set[str]:
    """
    Extract key content words from the Final Verdict section of the arbiter
    output. Falls back to the full verdict if the section is not found.
    """
    verdict_section = ''
    patterns = [
        r'FINAL VERDICT[:\s]+(.*?)(?=CONFIDENCE|DISSENTING|\Z)',
        r'Final Verdict[:\s]+(.*?)(?=Confidence|Dissenting|\Z)',
        r'VERDICT[:\s]+(.*?)(?=CONFIDENCE|DISSENTING|\Z)',
    ]
    for pattern in patterns:
        match = re.search(pattern, arbiter_verdict, re.DOTALL | re.IGNORECASE)
        if match:
            verdict_section = match.group(1).strip()
            break

    text = verdict_section or arbiter_verdict
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    # Filter stopwords
    stopwords = {
        'that', 'this', 'with', 'from', 'have', 'been', 'they', 'their',
        'will', 'more', 'than', 'also', 'some', 'most', 'into', 'over',
        'such', 'very', 'when', 'what', 'each', 'both', 'many', 'much',
        'only', 'even', 'just', 'because', 'while', 'where', 'there',
        'these', 'those', 'however', 'which', 'about', 'after', 'before',
        'other', 'agent', 'verdict', 'arbiter', 'score', 'confidence',
    }
    return {w for w in words if w not in stopwords}


def _term_overlap_score(text: str, verdict_terms: set[str]) -> float:
    """Score a response by how many verdict key terms it contains."""
    if not verdict_terms:
        return 0.0
    hits = sum(1 for term in verdict_terms if term in text)
    return hits / len(verdict_terms)


def _find_weakest_response(
    agent_responses: dict[str, str],
    arbiter_verdict: str,
) -> tuple[str, str]:
    """Find the agent response least aligned with the arbiter verdict."""
    verdict_terms = _extract_verdict_terms(arbiter_verdict)
    worst_role = ''
    worst_score = float('inf')
    worst_text = ''
    for role, text in agent_responses.items():
        if not text or len(text) < MIN_RESPONSE_LENGTH:
            continue
        score = _term_overlap_score(text.lower(), verdict_terms)
        if score < worst_score:
            worst_score = score
            worst_role = role
            worst_text = text
    return worst_role, worst_text


def _build_arbiter_prompt_excerpt(query: str, agent_responses: dict[str, str]) -> str:
    """Build a short prompt representing the arbiter's input context."""
    parts = [f"Question: {query}\n\nAgent Reports:"]
    for role, text in agent_responses.items():
        excerpt = text[:300].strip()
        parts.append(f"\n{role.upper()}:\n{excerpt}...")
    return '\n'.join(parts)
