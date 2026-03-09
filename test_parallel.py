from __future__ import annotations

import asyncio
import time

from core.agent_launcher import AgentLauncher


async def print_response(role: str, response: str, meta: dict[str, object]) -> None:
    print(f'[{role}] completed in {meta["duration_seconds"]:.3f}s ({meta["status"]})')
    print(response)
    print('-' * 72)


async def main() -> None:
    query = 'Is Bitcoin a good store of value in 2026?'
    launcher = AgentLauncher()
    started = time.perf_counter()
    responses, _ = await launcher.launch_agents(query, stream_callback=print_response)
    elapsed = time.perf_counter() - started
    print(f'Total elapsed time: {elapsed:.3f}s')
    print(f'All agents responded: {sorted(responses.keys())}')


if __name__ == '__main__':
    asyncio.run(main())
