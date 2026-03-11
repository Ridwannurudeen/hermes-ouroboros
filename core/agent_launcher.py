from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Awaitable, Callable

from agents import COUNCIL_AGENTS, AgentDefinition
from core.mode_prompts import get_agent_prompt
from core.web_search import EvidenceBundle
from providers import MockCouncilProvider

StreamCallback = Callable[[str, str, dict[str, object]], Awaitable[None] | None]
TokenCallback = Callable[[str, str], Awaitable[None] | None]


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
        token_callback: TokenCallback | None = None,
        evidence: EvidenceBundle | None = None,
        analysis_mode: str = 'default',
    ) -> tuple[dict[str, str], dict[str, dict[str, object]]]:
        tasks = [
            asyncio.create_task(
                self._run_agent(agent, query, stream_callback, token_callback=token_callback,
                                evidence=evidence, analysis_mode=analysis_mode)
            )
            for agent in COUNCIL_AGENTS
        ]
        completed = await asyncio.gather(*tasks)
        responses = {role: response for role, response, _ in completed}
        timings = {role: meta for role, _, meta in completed}
        return responses, timings

    async def launch_round2(
        self,
        query: str,
        round1_responses: dict[str, str],
        stream_callback: StreamCallback | None = None,
        token_callback: TokenCallback | None = None,
        analysis_mode: str = 'default',
    ) -> tuple[dict[str, str], dict[str, dict[str, object]]]:
        """Round 2: agents see each other's Round 1 responses and write rebuttals."""
        round1_summary = self._format_round1_summary(round1_responses)
        tasks = [
            asyncio.create_task(
                self._run_agent_round2(agent, query, round1_summary, stream_callback,
                                       token_callback=token_callback, analysis_mode=analysis_mode)
            )
            for agent in COUNCIL_AGENTS
        ]
        completed = await asyncio.gather(*tasks)
        responses = {role: response for role, response, _ in completed}
        timings = {role: meta for role, _, meta in completed}
        return responses, timings

    def _format_round1_summary(self, responses: dict[str, str]) -> str:
        parts = []
        for role in ('advocate', 'skeptic', 'oracle', 'contrarian'):
            text = responses.get(role, '')
            trimmed = ' '.join(text.split())[:600]
            if len(trimmed) < len(' '.join(text.split())):
                trimmed = trimmed.rsplit(' ', 1)[0] + ' ...'
            parts.append(f'{role.upper()}: {trimmed}')
        return '\n\n'.join(parts)

    async def _run_agent(
        self,
        agent: AgentDefinition,
        query: str,
        stream_callback: StreamCallback | None,
        token_callback: TokenCallback | None = None,
        evidence: EvidenceBundle | None = None,
        analysis_mode: str = 'default',
    ) -> tuple[str, str, dict[str, object]]:
        start = datetime.now(timezone.utc)
        meta: dict[str, object] = {
            'start_time': start.isoformat(),
            'status': 'ok',
        }
        # Use mode-specific prompt if available, else fall back to base agent prompt
        system_prompt = get_agent_prompt(analysis_mode, agent.role) or agent.system_prompt

        augmented_query = query
        if evidence and not evidence.is_empty():
            evidence_text = evidence.format_for_role(agent.role)
            if evidence_text:
                augmented_query = f"{query}\n\n---\nWEB EVIDENCE (cite URLs where relevant):\n{evidence_text}"
        try:
            use_streaming = token_callback and hasattr(self.provider, 'generate_stream')
            if use_streaming:
                response = await self._run_agent_streaming(
                    agent.role, system_prompt, augmented_query, token_callback
                )
            elif self._semaphore is None:
                response = await asyncio.wait_for(
                    self.provider.generate(agent.role, system_prompt, augmented_query),
                    timeout=self.timeout_seconds,
                )
            else:
                async with self._semaphore:
                    response = await asyncio.wait_for(
                        self.provider.generate(agent.role, system_prompt, augmented_query),
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

    async def _run_agent_round2(
        self,
        agent: AgentDefinition,
        query: str,
        round1_summary: str,
        stream_callback: StreamCallback | None,
        token_callback: TokenCallback | None = None,
        analysis_mode: str = 'default',
    ) -> tuple[str, str, dict[str, object]]:
        start = datetime.now(timezone.utc)
        meta: dict[str, object] = {
            'start_time': start.isoformat(),
            'status': 'ok',
        }
        base_prompt = get_agent_prompt(analysis_mode, agent.role) or agent.system_prompt
        system_prompt = (
            f'{base_prompt}\n\n'
            'ROUND 2 — REBUTTAL PHASE. You have now seen the other agents\' Round 1 responses below. '
            'Respond directly to their arguments. Quote and rebut specific claims. '
            'Strengthen your position or update it based on new evidence from others. '
            'Be specific — reference what other agents said by name.'
        )
        augmented_query = f'{query}\n\n---\nROUND 1 RESPONSES FROM ALL AGENTS:\n{round1_summary}'

        # Use r2_ prefix for streaming role so frontend can distinguish rounds
        stream_role = f'r2_{agent.role}'
        try:
            use_streaming = token_callback and hasattr(self.provider, 'generate_stream')
            if use_streaming:
                response = await self._run_agent_streaming(
                    stream_role, system_prompt, augmented_query, token_callback
                )
            elif self._semaphore is None:
                response = await asyncio.wait_for(
                    self.provider.generate(agent.role, system_prompt, augmented_query),
                    timeout=self.timeout_seconds,
                )
            else:
                async with self._semaphore:
                    response = await asyncio.wait_for(
                        self.provider.generate(agent.role, system_prompt, augmented_query),
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

    async def _run_agent_streaming(
        self,
        role: str,
        system_prompt: str,
        query: str,
        token_callback: TokenCallback,
    ) -> str:
        chunks: list[str] = []

        async def _iterate():
            async for token in self.provider.generate_stream(role, system_prompt, query):
                chunks.append(token)
                maybe = token_callback(role, token)
                if asyncio.iscoroutine(maybe):
                    await maybe

        if self._semaphore is None:
            await asyncio.wait_for(_iterate(), timeout=self.timeout_seconds)
        else:
            async with self._semaphore:
                await asyncio.wait_for(_iterate(), timeout=self.timeout_seconds)
        return ''.join(chunks)
