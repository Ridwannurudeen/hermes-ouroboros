from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.master_orchestrator import MasterOrchestrator
from core.settings import load_settings
from learning.trajectory_stats import build_stats
from providers.factory import build_provider

QUERIES = [
    'Is Ethereum undervalued at current prices?',
    'Will quantum computing break blockchain encryption?',
    'Is the Fed raising or cutting rates in 2026?',
    'Are AI agents replacing traditional software engineers?',
    'Is Solana more decentralized than Ethereum?',
    'Will Bitcoin reach $200k in 2026?',
    'Is DePIN the next big crypto narrative?',
    'Are stablecoins a systemic risk to the global financial system?',
    'Is Web3 gaming finally achieving mainstream adoption?',
    'Will the US create a strategic Bitcoin reserve?',
    'Is Rust the future of systems programming?',
    'Are ZK rollups more secure than optimistic rollups?',
    'Is AI training becoming too expensive for startups?',
    'Will decentralized identity replace passwords by 2030?',
    'Is climate change making certain regions uninvestable?',
    'Are prediction markets more accurate than polling?',
    'Is the dollar losing dominance faster than expected?',
    'Will AI-generated content destroy the creative industry?',
    'Is MEV extraction ethical in DeFi?',
    'Are hardware wallets still necessary in 2026?',
]


async def main() -> None:
    settings = load_settings(ROOT)
    provider = build_provider(settings)
    orchestrator = MasterOrchestrator(root=ROOT, provider=provider)

    for index, query in enumerate(QUERIES, start=1):
        await orchestrator.run_query(query)
        stats = build_stats(ROOT)
        print(
            f"Query {index}/{len(QUERIES)} complete - {stats['total']} trajectories captured, "
            f"{stats['high_quality']} high-quality"
        )
        if index < len(QUERIES):
            await asyncio.sleep(5)

    final_stats = build_stats(ROOT)
    print('Final trajectory stats:')
    print(final_stats)


if __name__ == '__main__':
    asyncio.run(main())
