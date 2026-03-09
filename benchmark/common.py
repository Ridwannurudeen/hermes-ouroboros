from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def load_questions(root: Path = ROOT) -> list[str]:
    return json.loads((root / 'benchmark' / 'questions.json').read_text(encoding='utf-8'))


def response_quality_score(result: dict[str, Any]) -> int:
    verdict = str(result.get('arbiter_verdict', ''))
    lowered = verdict.lower()
    confidence = int(result.get('confidence_score', -1))
    score = 0
    if len(verdict) >= 400:
        score += 40
    elif len(verdict) >= 200:
        score += 25
    elif len(verdict) >= 100:
        score += 10
    if 'dissenting views' in lowered or 'dissenting' in lowered:
        score += 20
    if any(kw in lowered for kw in ('key disagreements', 'final verdict', 'verdict:', 'bayesian update')):
        score += 20
    if confidence >= 80:
        score += 20
    elif confidence >= 60:
        score += 10
    return min(score, 100)


async def run_benchmark(
    label: str,
    output_name: str,
    runner: Callable[[str], Awaitable[tuple[dict[str, Any], dict[str, Any]]]],
    metadata: dict[str, Any],
    questions: list[str] | None = None,
    root: Path = ROOT,
) -> dict[str, Any]:
    benchmark_questions = questions or load_questions(root)
    scores: list[int] = []
    quality_scores: list[int] = []
    results: list[dict[str, Any]] = []
    runtime_modes: dict[str, int] = {}
    runtime_providers: dict[str, int] = {}
    agent_backends: dict[str, int] = {}

    for index, question in enumerate(benchmark_questions, start=1):
        print(f'[{index}/{len(benchmark_questions)}] {question}')
        result, runtime = await runner(question)
        quality = response_quality_score(result)
        confidence = int(result.get('confidence_score', -1))
        scores.append(confidence)
        quality_scores.append(quality)

        runtime_mode = str(runtime.get('mode', 'unknown'))
        runtime_provider = str(runtime.get('provider', 'unknown'))
        runtime_modes[runtime_mode] = runtime_modes.get(runtime_mode, 0) + 1
        runtime_providers[runtime_provider] = runtime_providers.get(runtime_provider, 0) + 1
        for meta in result.get('agent_timings', {}).values():
            backend = str(meta.get('backend') or 'unknown')
            agent_backends[backend] = agent_backends.get(backend, 0) + 1
        provider_meta = result.get('provider_meta', {})
        arbiter_meta = provider_meta.get('arbiter') if isinstance(provider_meta, dict) else None
        if isinstance(arbiter_meta, dict):
            backend = str(arbiter_meta.get('backend') or 'unknown')
            agent_backends[backend] = agent_backends.get(backend, 0) + 1

        print(
            f"  confidence={confidence} quality={quality} "
            f"elapsed={result['elapsed_seconds']}s session={result['session_id'][:8]} "
            f"mode={runtime_mode} provider={runtime_provider}"
        )
        if runtime.get('fallback_reason'):
            print(f"  fallback={runtime['fallback_reason']}")

        results.append(
            {
                'query': question,
                'confidence_score': confidence,
                'response_quality_score': quality,
                'elapsed_seconds': result['elapsed_seconds'],
                'verdict_length': len(str(result.get('arbiter_verdict', ''))),
                'session_id': result['session_id'],
                'runtime': runtime,
            }
        )

    average_confidence = round(sum(scores) / len(scores), 2) if scores else 0.0
    average_quality = round(sum(quality_scores) / len(quality_scores), 2) if quality_scores else 0.0
    average_time = round(sum(float(item['elapsed_seconds']) for item in results) / len(results), 2) if results else 0.0
    payload = {
        'label': label,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'metadata': metadata,
        'average_confidence': average_confidence,
        'average_response_quality': average_quality,
        'average_elapsed_seconds': average_time,
        'runtime_mode_counts': runtime_modes,
        'runtime_provider_counts': runtime_providers,
        'agent_backend_counts': agent_backends,
        'results': results,
    }
    destination = root / 'benchmark' / output_name
    destination.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    print(f'Average confidence: {average_confidence}')
    print(f'Average response quality: {average_quality}')
    print(f'Average elapsed seconds: {average_time}')
    print(f'Saved benchmark results to {destination}')
    return payload
