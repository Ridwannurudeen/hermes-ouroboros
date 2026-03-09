from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from agents import ARBITER_AGENT
from core.arbiter_prompt import build_arbiter_prompt

BANNED_PHRASES = ('[error]', '[timeout]', 'i cannot', "i don't know")
PREFERRED_TRAINING_CONFIDENCE = 80
DEFAULT_TRAINING_BATCH_SIZE = 100
ARBITER_EXAMPLE_SHARE = 60
SPECIALIST_EXAMPLE_SHARE = 40


def is_high_quality(trajectory: dict[str, Any]) -> bool:
    metadata = trajectory.get('metadata', {})
    confidence = _confidence_score(trajectory)
    response = trajectory.get('response', '')
    lowered = response.lower()
    return (
        confidence >= 60
        and len(response) >= 100
        and not any(phrase in lowered for phrase in BANNED_PHRASES)
    )


def filter_trajectories(jsonl_path: str | Path) -> list[dict[str, Any]]:
    path = Path(jsonl_path)
    filtered: list[dict[str, Any]] = []
    for line in path.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        if is_high_quality(record):
            filtered.append(record)
    return filtered


def get_training_batch(
    root: str | Path = '.',
    min_count: int = 50,
    target_count: int | None = None,
) -> list[dict[str, Any]]:
    root_path = Path(root)
    arbiter_examples = _build_arbiter_examples(root_path)
    specialist_examples = _build_specialist_examples(root_path)
    available_total = len(arbiter_examples) + len(specialist_examples)
    if available_total < min_count:
        return arbiter_examples + specialist_examples

    desired_count = target_count or min(available_total, max(DEFAULT_TRAINING_BATCH_SIZE, min_count))
    arbiter_target = min(len(arbiter_examples), min(desired_count, max(min_count // 2, ARBITER_EXAMPLE_SHARE)))
    specialist_target = min(len(specialist_examples), max(0, min(desired_count - arbiter_target, SPECIALIST_EXAMPLE_SHARE)))

    batch = _select_training_batch(arbiter_examples, arbiter_target)
    batch.extend(_select_training_batch(specialist_examples, specialist_target))

    if len(batch) >= desired_count:
        return batch[:desired_count]

    fallback_pool = _build_general_examples(root_path)
    fallback = _select_training_batch(fallback_pool, desired_count - len(batch))
    seen_identity = {_trajectory_identity(record) for record in batch}
    for record in fallback:
        identity = _trajectory_identity(record)
        if identity in seen_identity:
            continue
        batch.append(record)
        seen_identity.add(identity)
        if len(batch) >= desired_count:
            break
    return batch[:desired_count]


def _build_arbiter_examples(root_path: Path) -> list[dict[str, Any]]:
    sessions_dir = root_path / 'sessions'
    examples: list[dict[str, Any]] = []
    for path in sorted(sessions_dir.glob('*.json')):
        record = json.loads(path.read_text(encoding='utf-8'))
        confidence = int(record.get('confidence_score', -1))
        verdict = str(record.get('arbiter_verdict', ''))
        if confidence < PREFERRED_TRAINING_CONFIDENCE or not _is_training_response(verdict):
            continue
        user_prompt = build_arbiter_prompt(
            query=str(record.get('query', '')),
            agent_responses=record.get('agent_responses', {}) or {},
            additional_research=record.get('additional_research'),
            max_report_chars=700,
            max_research_chars=500,
        )
        examples.append(
            {
                'session_id': record.get('session_id', ''),
                'timestamp': record.get('timestamp', ''),
                'agent_role': 'arbiter',
                'system_prompt': ARBITER_AGENT.system_prompt,
                'user_query': user_prompt,
                'response': verdict,
                'metadata': {
                    'confidence_score': confidence,
                    'conflict_detected': bool(record.get('conflict_detected')),
                    'final_verdict': verdict,
                    'elapsed_seconds': record.get('elapsed_seconds', 0.0),
                    'source': 'session_arbiter',
                },
            }
        )
    return examples


def _build_specialist_examples(root_path: Path) -> list[dict[str, Any]]:
    examples = [
        record
        for record in _build_general_examples(root_path)
        if str(record.get('agent_role', '')).strip() != 'arbiter'
        and _confidence_score(record) >= PREFERRED_TRAINING_CONFIDENCE
    ]
    return examples


def _build_general_examples(root_path: Path) -> list[dict[str, Any]]:
    trajectories_dir = root_path / 'trajectories'
    candidates: list[dict[str, Any]] = []
    for path in sorted(trajectories_dir.glob('*.jsonl')):
        candidates.extend(filter_trajectories(path))
    return candidates


def _select_training_batch(candidates: list[dict[str, Any]], desired_count: int) -> list[dict[str, Any]]:
    ranked = sorted(
        candidates,
        key=lambda record: (
            _confidence_score(record),
            _timestamp_key(record),
            len(record.get('response', '')),
        ),
        reverse=True,
    )

    unique_records: list[dict[str, Any]] = []
    seen_identity: set[tuple[str, str, str]] = set()
    for record in ranked:
        identity = _trajectory_identity(record)
        if identity in seen_identity:
            continue
        seen_identity.add(identity)
        unique_records.append(record)

    selected: list[dict[str, Any]] = []
    seen_query_role: set[tuple[str, str]] = set()
    for record in unique_records:
        query_role = (str(record.get('user_query', '')).strip(), str(record.get('agent_role', 'unknown')).strip())
        if query_role in seen_query_role:
            continue
        seen_query_role.add(query_role)
        selected.append(record)
        if len(selected) >= desired_count:
            return selected

    if len(selected) >= desired_count:
        return selected[:desired_count]

    selected_identities = {_trajectory_identity(record) for record in selected}
    for record in unique_records:
        identity = _trajectory_identity(record)
        if identity in selected_identities:
            continue
        selected.append(record)
        if len(selected) >= desired_count:
            break
    return selected[:desired_count]


def _trajectory_identity(record: dict[str, Any]) -> tuple[str, str, str]:
    return (
        str(record.get('agent_role', 'unknown')).strip(),
        str(record.get('user_query', '')).strip(),
        str(record.get('response', '')).strip(),
    )


def _confidence_score(record: dict[str, Any]) -> int:
    metadata = record.get('metadata', {})
    try:
        return int(metadata.get('confidence_score', -1))
    except (TypeError, ValueError):
        return -1


def _timestamp_key(record: dict[str, Any]) -> str:
    timestamp = record.get('timestamp')
    return timestamp if isinstance(timestamp, str) else ''


def _is_training_response(response: str) -> bool:
    lowered = response.lower()
    return bool(response.strip()) and len(response) >= 150 and not any(phrase in lowered for phrase in BANNED_PHRASES)
