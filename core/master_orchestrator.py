from __future__ import annotations

import asyncio
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agents import ARBITER_AGENT
from core.agent_launcher import AgentLauncher
from core.arbiter_prompt import build_arbiter_prompt
from core.conflict_resolver import ConflictResolver
from core.mode_prompts import get_arbiter_prompt
from core.verdict_parser import parse_verdict
from core.claim_extractor import extract_claims
from core.web_search import EvidenceGatherer
from core.session_store import SessionStore
from core.settings import load_settings
from core.skill_creator import SkillCreator
from learning.preference_extractor import extract_preference_pairs
from learning.trajectory_logger import TrajectoryLogger
from providers import MockCouncilProvider, build_provider


class MasterOrchestrator:
    def __init__(self, root: str | Path = '.', provider: object | None = None) -> None:
        self.root = Path(root)
        self.logs_dir = self.root / 'logs'
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.settings = load_settings(self.root)
        self.provider = provider or self._build_default_provider()
        self.agent_launcher = AgentLauncher(provider=self.provider)
        self.conflict_resolver = ConflictResolver(provider=self.provider)
        self.session_store = SessionStore(self.root)
        self.trajectory_logger = TrajectoryLogger(self.root)
        self.skill_creator = SkillCreator(self.root)

    async def run_query(self, query: str, stream_callback=None, token_callback=None,
                        analysis_mode: str = 'default') -> dict[str, Any]:
        session_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        started = datetime.now(timezone.utc)
        self._append_log(f'{timestamp} | {session_id} | RECEIVED | mode={analysis_mode} | {query}')

        try:
            # Gather web evidence
            print('Gathering web evidence...')
            try:
                evidence = await EvidenceGatherer().gather(query)
            except Exception:
                evidence = None

            # Round 1: all agents respond in parallel
            print('Round 1: Agents dispatched...')
            agent_responses, agent_timings = await self.agent_launcher.launch_agents(
                query, stream_callback=stream_callback, token_callback=token_callback,
                evidence=evidence, analysis_mode=analysis_mode,
            )

            # Round 2: agents see each other's Round 1 and rebut (for non-default modes)
            round2_responses: dict[str, str] | None = None
            round2_timings: dict[str, dict[str, object]] | None = None
            if analysis_mode != 'default':
                print('Round 2: Rebuttal phase...')
                round2_responses, round2_timings = await self.agent_launcher.launch_round2(
                    query, agent_responses, stream_callback=stream_callback,
                    token_callback=token_callback, analysis_mode=analysis_mode,
                )

            # Conflict resolution
            conflict = await self.conflict_resolver.resolve(query, agent_responses)

            # Build arbiter prompt with mode-awareness and optional Round 2
            arbiter_user_prompt = build_arbiter_prompt(
                query=query,
                agent_responses=agent_responses,
                additional_research=conflict.additional_research,
                analysis_mode=analysis_mode,
                round2_responses=round2_responses,
            )

            # Get mode-specific arbiter system prompt (or fall back to base)
            arbiter_system_prompt = get_arbiter_prompt(analysis_mode) or ARBITER_AGENT.system_prompt

            arbiter_context = {
                'conflict_summary': conflict.conflict_summary,
                'additional_research': conflict.additional_research or '',
            }
            if token_callback and hasattr(self.provider, 'generate_stream'):
                arbiter_verdict = await self._stream_arbiter(
                    arbiter_user_prompt, arbiter_context, token_callback,
                    arbiter_system_prompt=arbiter_system_prompt,
                )
            else:
                arbiter_verdict = await self.provider.generate(
                    'arbiter',
                    arbiter_system_prompt,
                    arbiter_user_prompt,
                    context=arbiter_context,
                )
            arbiter_meta = self._consume_provider_diagnostics()
            confidence_score = self._parse_confidence(arbiter_verdict)
            hermes_score = self._parse_hermes_score(arbiter_verdict)
            verdict_sections = parse_verdict(arbiter_verdict)
            if hermes_score == -1 and 'hermes_score' in verdict_sections:
                hermes_score = verdict_sections['hermes_score']
            elapsed_seconds = round((datetime.now(timezone.utc) - started).total_seconds(), 3)
            # Extract atomic claims from arbiter verdict (no extra LLM call)
            web_evidence_dict = evidence.to_dict() if evidence and not evidence.is_empty() else None
            claim_breakdown = extract_claims(arbiter_verdict, web_evidence_dict)

            session_result: dict[str, Any] = {
                'query': query,
                'timestamp': timestamp,
                'session_id': session_id,
                'analysis_mode': analysis_mode,
                'agent_responses': agent_responses,
                'round2_responses': round2_responses,
                'arbiter_verdict': arbiter_verdict,
                'confidence_score': confidence_score,
                'hermes_score': hermes_score,
                'elapsed_seconds': elapsed_seconds,
                'conflict_detected': conflict.conflict_detected,
                'conflict_summary': conflict.conflict_summary,
                'additional_research': conflict.additional_research,
                'agent_timings': agent_timings,
                'round2_timings': round2_timings,
                'verdict_sections': verdict_sections,
                'claim_breakdown': claim_breakdown,
                'web_evidence': web_evidence_dict,
                'provider_meta': {
                    'research': conflict.additional_research_meta,
                    'arbiter': arbiter_meta,
                },
            }
            skill_path = self.skill_creator.maybe_create_skill(session_result)
            if skill_path:
                session_result['skill_path'] = skill_path
            dpo_pairs = extract_preference_pairs(session_result)
            if dpo_pairs:
                session_result['dpo_pairs_count'] = len(dpo_pairs)
                self._save_dpo_pairs(session_id, dpo_pairs)
            session_path = self.session_store.save_session(session_result)
            trajectory_count = self.trajectory_logger.log_session(session_result)
            self._append_log(
                f"{datetime.now(timezone.utc).isoformat()} | {session_id} | COMPLETE | "
                f"mode={analysis_mode} | confidence={confidence_score} | hermes={hermes_score} | "
                f"conflict={conflict.conflict_detected} | "
                f"trajectories={trajectory_count} | skill={'yes' if skill_path else 'no'} | session={session_path.name}"
            )
            return session_result
        except Exception as exc:
            elapsed_seconds = round((datetime.now(timezone.utc) - started).total_seconds(), 3)
            self._append_log(f'{datetime.now(timezone.utc).isoformat()} | {session_id} | ERROR | {exc}')
            return {
                'query': query,
                'timestamp': timestamp,
                'session_id': session_id,
                'analysis_mode': analysis_mode,
                'agent_responses': {},
                'round2_responses': None,
                'arbiter_verdict': f'[ERROR] {exc}',
                'confidence_score': -1,
                'hermes_score': -1,
                'elapsed_seconds': elapsed_seconds,
                'conflict_detected': False,
                'conflict_summary': 'Pipeline failed before conflict analysis.',
                'additional_research': None,
                'agent_timings': {},
                'round2_timings': None,
            }

    async def _stream_arbiter(
        self,
        arbiter_prompt: str,
        context: dict[str, str],
        token_callback,
        arbiter_system_prompt: str | None = None,
    ) -> str:
        system_prompt = arbiter_system_prompt or ARBITER_AGENT.system_prompt
        chunks: list[str] = []
        async for token in self.provider.generate_stream(
            'arbiter', system_prompt, arbiter_prompt, context=context
        ):
            chunks.append(token)
            maybe = token_callback('arbiter', token)
            if asyncio.iscoroutine(maybe):
                await maybe
        return ''.join(chunks)

    def _save_dpo_pairs(self, session_id: str, pairs: list[dict]) -> None:
        dpo_dir = self.root / 'trajectories' / 'dpo'
        dpo_dir.mkdir(parents=True, exist_ok=True)
        path = dpo_dir / f'{session_id}.json'
        import json as _json
        path.write_text(_json.dumps(pairs, indent=2), encoding='utf-8')

    def _append_log(self, line: str) -> None:
        with (self.logs_dir / 'sessions.log').open('a', encoding='utf-8') as handle:
            handle.write(line + '\n')

    def _consume_provider_diagnostics(self) -> dict[str, object] | None:
        if not hasattr(self.provider, 'consume_generation_diagnostics'):
            return None
        return self.provider.consume_generation_diagnostics()

    def _build_default_provider(self) -> object:
        try:
            return build_provider(self.settings)
        except Exception as exc:
            self._append_log(
                f"{datetime.now(timezone.utc).isoformat()} | WARN | Falling back to mock provider | {exc}"
            )
            return MockCouncilProvider()

    def _parse_confidence(self, verdict: str) -> int:
        ten_scale = re.search(r'(\d{1,2})\s*/\s*10\b', verdict, flags=re.IGNORECASE)
        if ten_scale:
            return int(ten_scale.group(1)) * 10
        patterns = (
            r'confidence(?:\s+score)?\s*[:=]\s*(\d{1,3})',
            r'confidence(?:\s+score)?\s*\n+\s*(\d{1,3})',
            r'confidence(?:\s+score)?"\s*[:=]\s*(\d{1,3})',
            r'(\d{1,3})\s*/\s*100',
            r'(\d{1,3})%',
        )
        for pattern in patterns:
            match = re.search(pattern, verdict, flags=re.IGNORECASE)
            if match:
                return int(match.group(1))
        self._append_log(f'{datetime.now(timezone.utc).isoformat()} | WARN | Could not parse confidence from verdict')
        return -1

    def _parse_hermes_score(self, verdict: str) -> int:
        patterns = (
            r'HERMES\s+SCORE\s*[:=]\s*\[?\s*(\d{1,3})\s*\]?',
            r'HERMES\s+SCORE\s*[:=]\s*(\d{1,3})',
        )
        for pattern in patterns:
            match = re.search(pattern, verdict, flags=re.IGNORECASE)
            if match:
                return min(int(match.group(1)), 100)
        return self._parse_confidence(verdict)


def run_sync(query: str, root: str | Path = '.') -> dict[str, Any]:
    orchestrator = MasterOrchestrator(root=root)
    return asyncio.run(orchestrator.run_query(query))
