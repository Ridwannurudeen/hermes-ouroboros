from __future__ import annotations

import asyncio
import json
from pathlib import Path

from core.master_orchestrator import MasterOrchestrator


async def main() -> None:
    root = Path(__file__).resolve().parent
    orchestrator = MasterOrchestrator(root=root)
    queries = [
        'Should I buy ETH at current prices?',
        'Is Solana a threat to Ethereum?',
    ]
    for query in queries:
        result = await orchestrator.run_query(query)
        print(json.dumps(result, indent=2))
        print('=' * 80)


if __name__ == '__main__':
    asyncio.run(main())
