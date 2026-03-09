from __future__ import annotations

import asyncio
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from benchmark.common import run_benchmark
from core.master_orchestrator import MasterOrchestrator
from core.runtime_router import RuntimeRouter
from core.settings import load_settings
from providers.factory import build_provider


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Run the trained-path benchmark.')
    parser.add_argument('--label', default='v1_trained_current_path', help='Result label written to the benchmark payload.')
    parser.add_argument('--output-name', default='results_v1.json', help='Benchmark output filename inside benchmark/.')
    parser.add_argument('--note', help='Optional metadata note override.')
    return parser


async def main() -> None:
    args = build_parser().parse_args()
    settings = load_settings(ROOT)
    provider = build_provider(settings)
    orchestrator = MasterOrchestrator(root=ROOT, provider=provider)
    runtime = RuntimeRouter(settings, orchestrator)

    async def runner(question: str):
        return await runtime.run_query(question, mode='trained')

    await run_benchmark(
        label=args.label,
        output_name=args.output_name,
        runner=runner,
        metadata={
            'configured_provider_name': settings.provider.name,
            'configured_provider_class': type(orchestrator.provider).__name__,
            'configured_model': settings.provider.model,
            'base_url': settings.provider.base_url,
            'note': args.note
            or 'Uses the current trained route. This may be modal-backed or trained_fallback depending on backend availability.',
        },
        root=ROOT,
    )


if __name__ == '__main__':
    asyncio.run(main())
