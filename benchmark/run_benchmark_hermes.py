"""
Honest benchmark: base Hermes-3 (Ollama) vs Hermes-3 + learned guidance (TrainedFallback).

Run AFTER at least one full council loop so learned guidance files exist.

Usage:
    python -X utf8 benchmark/run_benchmark_hermes.py
"""
from __future__ import annotations

import asyncio
import sys
from dataclasses import replace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from benchmark.common import run_benchmark
from core.master_orchestrator import MasterOrchestrator
from core.settings import load_settings
from providers.factory import build_provider
from providers.trained_fallback import TrainedFallbackProvider


async def main() -> None:
    settings = load_settings(ROOT)

    # Ensure both runs use Ollama as their inference engine.
    ollama_settings = replace(
        settings,
        provider=replace(settings.provider, name='ollama'),
    )

    # --- Run 1: base Hermes (raw Ollama, no guidance injection) ---
    base_provider = build_provider(ollama_settings)
    base_orchestrator = MasterOrchestrator(root=ROOT, provider=base_provider)

    async def base_runner(question: str):
        result = await base_orchestrator.run_query(question)
        return result, {
            'mode': 'base_hermes',
            'provider': 'OllamaHermes3',
            'fallback_reason': None,
        }

    print('\n=== RUN 1: Base Hermes-3 (no learned guidance) ===\n')
    base_results = await run_benchmark(
        label='hermes3_base',
        output_name='results_hermes_base.json',
        runner=base_runner,
        metadata={
            'description': 'Base Hermes-3 via Ollama, no guidance injection',
            'model': settings.provider.model,
            'base_url': settings.provider.base_url,
        },
        root=ROOT,
    )

    # --- Run 2: Hermes + learned guidance (TrainedFallback wrapping Ollama) ---
    guided_provider = TrainedFallbackProvider(
        root=ROOT,
        base_provider=build_provider(ollama_settings),
        profile_name='learned_profile',
    )
    guided_orchestrator = MasterOrchestrator(root=ROOT, provider=guided_provider)

    async def guided_runner(question: str):
        result = await guided_orchestrator.run_query(question)
        return result, {
            'mode': 'hermes_guided',
            'provider': 'TrainedFallback->OllamaHermes3',
            'fallback_reason': None,
        }

    print('\n=== RUN 2: Hermes-3 + Learned Guidance ===\n')
    guided_results = await run_benchmark(
        label='hermes3_guided',
        output_name='results_hermes_guided.json',
        runner=guided_runner,
        metadata={
            'description': 'Hermes-3 via Ollama with learned guidance injected from council sessions',
            'model': settings.provider.model,
            'base_url': settings.provider.base_url,
        },
        root=ROOT,
    )

    # --- Summary ---
    base_conf = base_results.get('average_confidence', 0)
    guided_conf = guided_results.get('average_confidence', 0)
    base_quality = base_results.get('average_response_quality', 0)
    guided_quality = guided_results.get('average_response_quality', 0)
    base_time = base_results.get('average_elapsed_seconds', 0)
    guided_time = guided_results.get('average_elapsed_seconds', 0)

    print('\n' + '=' * 60)
    print('HERMES OUROBOROS — BENCHMARK SUMMARY')
    print('=' * 60)
    print(f"{'Metric':<32} {'Base Hermes':>14} {'+ Guidance':>14} {'Delta':>10}")
    print('-' * 72)
    conf_delta = guided_conf - base_conf
    quality_delta = guided_quality - base_quality
    time_delta = guided_time - base_time
    print(f"{'Avg confidence':<32} {base_conf:>14.1f} {guided_conf:>14.1f} {conf_delta:>+10.1f}")
    print(f"{'Avg response quality':<32} {base_quality:>14.1f} {guided_quality:>14.1f} {quality_delta:>+10.1f}")
    print(f"{'Avg elapsed (s)':<32} {base_time:>14.1f} {guided_time:>14.1f} {time_delta:>+10.1f}")
    print('=' * 60)
    print('\nResults saved to benchmark/results_hermes_base.json and benchmark/results_hermes_guided.json')


if __name__ == '__main__':
    asyncio.run(main())
