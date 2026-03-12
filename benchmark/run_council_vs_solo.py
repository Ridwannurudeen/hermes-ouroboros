"""
Benchmark: 5-Agent Council vs Solo Hermes-3 on 30 verifiable claims.

Runs each claim through:
  1. Solo Hermes-3 (single model, generic system prompt)
  2. Full 5-agent adversarial council (2 rounds + arbiter)

Measures: confidence, quality, depth, elapsed time, ground-truth accuracy.
Saves results to benchmark/results_council_vs_solo.json

Usage:
    python -X utf8 benchmark/run_council_vs_solo.py [--claims N]
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from benchmark.common import response_quality_score
from core.master_orchestrator import MasterOrchestrator
from core.settings import load_settings
from providers.factory import build_provider


def load_claims(root: Path = ROOT) -> list[dict[str, Any]]:
    return json.loads((root / 'benchmark' / 'claims.json').read_text(encoding='utf-8'))


def solo_quality_score(response: str) -> int:
    """Score solo responses on depth and structure (0-100)."""
    lowered = response.lower()
    score = 0
    # Length
    if len(response) >= 600:
        score += 30
    elif len(response) >= 300:
        score += 20
    elif len(response) >= 100:
        score += 10
    # Nuance indicators
    if any(kw in lowered for kw in ('however', 'on the other hand', 'counter-argument', 'nuance', 'caveat')):
        score += 15
    # Evidence references
    if any(kw in lowered for kw in ('study', 'research', 'data', 'according to', 'evidence')):
        score += 15
    # Structured thinking
    if any(kw in lowered for kw in ('first', 'second', 'argument for', 'argument against', 'pros', 'cons')):
        score += 15
    # Uncertainty acknowledgment
    if any(kw in lowered for kw in ('uncertain', 'unclear', 'debatable', 'depends', 'complex', 'mixed')):
        score += 10
    # Specific numbers/stats
    if any(c.isdigit() for c in response) and '%' in response:
        score += 15
    return min(score, 100)


def _response_says_false(text: str) -> bool:
    """Heuristic: does the response identify the claim as false/misleading?"""
    low = text.lower()
    false_signals = ['false', 'myth', 'misconception', 'not true', 'inaccurate',
                     'misleading', 'debunked', 'no scientific', 'not supported',
                     'no evidence', 'incorrect', 'refuted', 'disputed']
    true_signals = ['true', 'correct', 'accurate', 'confirmed', 'supported',
                    'well-established', 'scientifically proven', 'evidence supports']
    false_count = sum(1 for s in false_signals if s in low)
    true_count = sum(1 for s in true_signals if s in low)
    return false_count > true_count


def _response_says_nuanced(text: str) -> bool:
    """Heuristic: does the response identify the claim as nuanced/partially true?"""
    low = text.lower()
    nuance_signals = ['partially', 'nuanced', 'mixed', 'depends', 'oversimplif',
                      'some truth', 'not entirely', 'more complicated', 'both',
                      'misleading', 'context', 'it depends']
    return sum(1 for s in nuance_signals if s in low) >= 2


def score_accuracy(ground_truth: str | None, response_text: str,
                   verdict_label: str = '', hermes_score: int = -1) -> dict[str, Any]:
    """Score whether a response correctly identifies the ground truth.

    Returns: {accurate: bool, alignment: str, ground_truth: str}
    """
    if ground_truth is None:
        return {'accurate': None, 'alignment': 'no_ground_truth', 'ground_truth': None}

    gt = ground_truth.lower().strip()
    low_text = response_text.lower()
    low_label = verdict_label.lower().strip() if verdict_label else ''

    if gt == 'false':
        accurate = _response_says_false(response_text)
        alignment = 'correct_reject' if accurate else 'missed_false'
    elif gt == 'true':
        accurate = not _response_says_false(response_text)
        alignment = 'correct_accept' if accurate else 'false_reject'
    elif gt in ('misleading', 'partially_true', 'mostly_true'):
        accurate = _response_says_nuanced(response_text)
        if not accurate:
            # Also accept if they correctly flagged the direction
            if gt == 'misleading':
                accurate = _response_says_false(response_text)
            elif gt == 'mostly_true':
                accurate = not _response_says_false(response_text)
        alignment = 'correct_nuance' if accurate else 'missed_nuance'
    else:
        return {'accurate': None, 'alignment': 'unknown_gt', 'ground_truth': gt}

    return {'accurate': accurate, 'alignment': alignment, 'ground_truth': gt}


async def run_solo(provider, query: str) -> dict[str, Any]:
    """Run a single claim through solo Hermes-3."""
    system_prompt = (
        'You are a helpful AI assistant. Analyze the following question or claim thoroughly. '
        'Provide your honest assessment with key arguments for and against. Be concise but comprehensive.'
    )
    t0 = time.monotonic()
    try:
        response = await provider.generate('solo', system_prompt, query)
    except Exception as exc:
        response = f'[ERROR: {exc}]'
    elapsed = round(time.monotonic() - t0, 2)
    return {
        'response': response,
        'elapsed_seconds': elapsed,
        'quality_score': solo_quality_score(response),
    }


async def run_council(orchestrator: MasterOrchestrator, query: str, analysis_mode: str) -> dict[str, Any]:
    """Run a single claim through the full 5-agent council."""
    t0 = time.monotonic()
    try:
        result = await orchestrator.run_query(query, analysis_mode=analysis_mode)
    except Exception as exc:
        return {
            'error': str(exc),
            'elapsed_seconds': round(time.monotonic() - t0, 2),
        }
    elapsed = round(time.monotonic() - t0, 2)
    return {
        'session_id': result.get('session_id', ''),
        'confidence_score': result.get('confidence_score', -1),
        'hermes_score': result.get('hermes_score', -1),
        'quality_score': response_quality_score(result),
        'verdict_label': (result.get('verdict_sections') or {}).get('verdict_label', ''),
        'verdict_preview': (result.get('arbiter_verdict') or '')[:500],
        'conflict_detected': result.get('conflict_detected', False),
        'agent_count': len(result.get('agent_responses', {})),
        'has_round2': bool(result.get('round2_responses')),
        'has_web_evidence': bool(result.get('web_evidence')),
        'elapsed_seconds': elapsed,
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--claims', type=int, default=0, help='Limit number of claims (0=all)')
    args = parser.parse_args()

    settings = load_settings(ROOT)
    provider = build_provider(settings)
    orchestrator = MasterOrchestrator(root=ROOT, provider=provider)

    claims = load_claims(ROOT)
    if args.claims > 0:
        claims = claims[:args.claims]

    results: list[dict[str, Any]] = []
    solo_scores: list[int] = []
    council_scores: list[int] = []
    solo_times: list[float] = []
    council_times: list[float] = []

    for i, claim_data in enumerate(claims, 1):
        claim = claim_data['claim']
        category = claim_data.get('category', 'verify')
        ground_truth = claim_data.get('ground_truth')
        print(f'\n[{i}/{len(claims)}] {claim[:80]}...')

        # Run solo and council in sequence (to avoid overloading the API)
        print('  Solo...', end=' ', flush=True)
        solo = await run_solo(provider, claim)
        print(f'done ({solo["elapsed_seconds"]}s, quality={solo["quality_score"]})')

        print('  Council...', end=' ', flush=True)
        council = await run_council(orchestrator, claim, analysis_mode=category)
        c_quality = council.get('quality_score', 0)
        c_time = council.get('elapsed_seconds', 0)
        print(f'done ({c_time}s, quality={c_quality}, confidence={council.get("confidence_score", "?")})')

        # Accuracy scoring against ground truth
        solo_acc = score_accuracy(ground_truth, solo.get('response', ''))
        council_acc = score_accuracy(
            ground_truth,
            council.get('verdict_preview', ''),
            verdict_label=council.get('verdict_label', ''),
            hermes_score=council.get('hermes_score', -1),
        )

        solo_scores.append(solo['quality_score'])
        council_scores.append(c_quality)
        solo_times.append(solo['elapsed_seconds'])
        council_times.append(c_time)

        results.append({
            'claim': claim,
            'category': category,
            'ground_truth': ground_truth,
            'solo': {**solo, 'accuracy': solo_acc},
            'council': {**council, 'accuracy': council_acc},
        })

    # Aggregate stats
    n = len(results)
    avg_solo_quality = round(sum(solo_scores) / n, 1) if n else 0
    avg_council_quality = round(sum(council_scores) / n, 1) if n else 0
    avg_solo_time = round(sum(solo_times) / n, 1) if n else 0
    avg_council_time = round(sum(council_times) / n, 1) if n else 0
    council_wins = sum(1 for s, c in zip(solo_scores, council_scores) if c > s)
    solo_wins = sum(1 for s, c in zip(solo_scores, council_scores) if s > c)
    ties = n - council_wins - solo_wins

    avg_council_confidence = 0
    conf_values = [r['council'].get('confidence_score', -1) for r in results if r['council'].get('confidence_score', -1) >= 0]
    if conf_values:
        avg_council_confidence = round(sum(conf_values) / len(conf_values), 1)

    # Accuracy aggregation (only for claims with ground truth)
    gt_results = [r for r in results if r['ground_truth'] is not None]
    gt_n = len(gt_results)
    solo_correct = sum(1 for r in gt_results if r['solo'].get('accuracy', {}).get('accurate'))
    council_correct = sum(1 for r in gt_results if r['council'].get('accuracy', {}).get('accurate'))
    solo_accuracy = round(solo_correct / max(gt_n, 1) * 100, 1)
    council_accuracy = round(council_correct / max(gt_n, 1) * 100, 1)

    payload = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'total_claims': n,
        'summary': {
            'avg_solo_quality': avg_solo_quality,
            'avg_council_quality': avg_council_quality,
            'quality_improvement': round(((avg_council_quality - avg_solo_quality) / max(avg_solo_quality, 1)) * 100, 1),
            'avg_council_confidence': avg_council_confidence,
            'avg_solo_time': avg_solo_time,
            'avg_council_time': avg_council_time,
            'council_wins': council_wins,
            'solo_wins': solo_wins,
            'ties': ties,
            'council_win_rate': round(council_wins / max(n, 1) * 100, 1),
            'ground_truth_claims': gt_n,
            'solo_accuracy': solo_accuracy,
            'council_accuracy': council_accuracy,
            'accuracy_improvement': round(council_accuracy - solo_accuracy, 1),
        },
        'results': results,
    }

    # Write to mounted volume if available, otherwise local benchmark dir
    mounted = ROOT / 'benchmark_results'
    out_dir = mounted if mounted.is_dir() else ROOT / 'benchmark'
    out = out_dir / 'results_council_vs_solo.json'
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f'\n{"=" * 60}')
    print('COUNCIL vs SOLO — BENCHMARK RESULTS')
    print(f'{"=" * 60}')
    print(f'Claims evaluated:        {n}')
    print(f'Avg Solo Quality:        {avg_solo_quality}/100')
    print(f'Avg Council Quality:     {avg_council_quality}/100')
    print(f'Quality Improvement:     {payload["summary"]["quality_improvement"]:+.1f}%')
    print(f'Avg Council Confidence:  {avg_council_confidence}/100')
    print(f'Council Wins:            {council_wins}/{n} ({payload["summary"]["council_win_rate"]}%)')
    print(f'Solo Wins:               {solo_wins}/{n}')
    print(f'Ties:                    {ties}/{n}')
    print(f'Avg Solo Time:           {avg_solo_time}s')
    print(f'Avg Council Time:        {avg_council_time}s')
    print(f'{"-" * 60}')
    print(f'Ground-Truth Claims:     {gt_n}')
    print(f'Solo Accuracy:           {solo_accuracy}%')
    print(f'Council Accuracy:        {council_accuracy}%')
    print(f'Accuracy Improvement:    {council_accuracy - solo_accuracy:+.1f}pp')
    print(f'{"=" * 60}')
    print(f'Saved to {out}')


if __name__ == '__main__':
    asyncio.run(main())
