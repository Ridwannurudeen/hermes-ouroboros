from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Awaitable, Callable

from agents import COUNCIL_AGENTS, AgentDefinition
from core.web_search import EvidenceBundle
from providers import MockCouncilProvider

StreamCallback = Callable[[str, str, dict[str, object]], Awaitable[None] | None]


class AgentLauncher:
    def __init__(self, provider: object | None = None, timeout_seconds: float | None = None) -> None:
        self.provider = provider or MockCouncilProvider()
        provider_timeout = getattr(self.provider, 'timeout_seconds', 60.0)
        provider_concurrency = getattr(self.provider, 'max_concurrency', 0)
        self.timeout_seconds = timeout_seconds if timeout_seconds is not None else provider_timeout
        self._semaphore = asyncio.Semaphore(provider_concurrency) if provider_concurrency else None

    async def launch_agents(
        self,
        query: str,
        stream_callback: StreamCallback | None = None,
        evidence: EvidenceBundle | None = None,
    ) -> tuple[dict[str, str], dict[str, dict[str, object]]]:
        tasks = [
            asyncio.create_task(self._run_agent(agent, query, stream_callback, evidence=evidence))
            for agent in COUNCIL_AGENTS
        ]
        completed = await asyncio.gather(*tasks)
        responses = {role: response for role, response, _ in completed}
        timings = {role: meta for role, _, meta in completed}
        return responses, timings

    async def _run_agent(
        self,
        agent: AgentDefinition,
        query: str,
        stream_callback: StreamCallback | None,
        evidence: EvidenceBundle | None = None,
    ) -> tuple[str, str, dict[str, object]]:
        start = datetime.now(timezone.utc)
        meta: dict[str, object] = {
            'start_time': start.isoformat(),
            'status': 'ok',
        }
        augmented_query = query
        if evidence and not evidence.is_empty():
            evidence_text = evidence.format_for_role(agent.role)
            if evidence_text:
                augmented_query = f"{query}\n\n---\nWEB EVIDENCE (cite URLs where relevant):\n{evidence_text}"
        try:
            if self._semaphore is None:
                response = await asyncio.wait_for(
                    self.provider.generate(agent.role, agent.system_prompt, augmented_query),
                    timeout=self.timeout_seconds,
                )
            else:
                async with self._semaphore:
                    response = await asyncio.wait_for(
                        self.provider.generate(agent.role, agent.system_prompt, augmented_query),
                        timeout=self.timeout_seconds,
                    )
        except asyncio.TimeoutError:
            response = '[TIMEOUT] Agent exceeded the configured timeout.'
            meta['status'] = 'timeout'
        except Exception as exc:
            response = f'[ERROR] {exc}'
            meta['status'] = 'error'
        end = datetime.now(timezone.utc)
        meta['end_time'] = end.isoformat()
        meta['duration_seconds'] = round((end - start).total_seconds(), 3)
        if hasattr(self.provider, 'consume_generation_diagnostics'):
            diagnostics = self.provider.consume_generation_diagnostics()
            meta['backend'] = diagnostics.get('backend')
            if diagnostics.get('error'):
                meta['provider_error'] = diagnostics.get('error')
        if stream_callback:
            maybe_awaitable = stream_callback(agent.role, response, meta)
            if asyncio.iscoroutine(maybe_awaitable):
                await maybe_awaitable
        return agent.role, response, meta
