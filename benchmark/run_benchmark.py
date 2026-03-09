from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from benchmark.common import run_benchmark
from core.master_orchestrator import MasterOrchestrator
from core.settings import load_settings
from providers.factory import build_provider

async def main() -> None:
    settings = load_settings(ROOT)
    provider = build_provider(settings)
    orchestrator = MasterOrchestrator(root=ROOT, provider=provider)

    async def runner(question: str):
        result = await orchestrator.run_query(question)
        return result, {
            'mode': 'default',
            'provider': type(orchestrator.provider).__name__,
            'fallback_reason': None,
        }

    await run_benchmark(
        label='v0_base_live',
        output_name='results_v0.json',
        runner=runner,
        metadata={
            'provider_name': settings.provider.name,
            'provider_class': type(orchestrator.provider).__name__,
            'model': settings.provider.model,
            'base_url': settings.provider.base_url,
        },
        root=ROOT,
    )


if __name__ == '__main__':
    asyncio.run(main())
