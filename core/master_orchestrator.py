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

    async def run_query(self, query: str, stream_callback=None) -> dict[str, Any]:
        session_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        started = datetime.now(timezone.utc)
        self._append_log(f'{timestamp} | {session_id} | RECEIVED | {query}')

        try:
            print('Agents dispatched... waiting for responses...')
            agent_responses, agent_timings = await self.agent_launcher.launch_agents(query, stream_callback=stream_callback)
            conflict = await self.conflict_resolver.resolve(query, agent_responses)
            arbiter_prompt = self._build_arbiter_prompt(query, agent_responses, conflict)
            arbiter_verdict = await self.provider.generate(
                'arbiter',
                ARBITER_AGENT.system_prompt,
                arbiter_prompt,
                context={
                    'conflict_summary': conflict.conflict_summary,
                    'additional_research': conflict.additional_research or '',
                },
            )
            arbiter_meta = self._consume_provider_diagnostics()
            confidence_score = self._parse_confidence(arbiter_verdict)
            elapsed_seconds = round((datetime.now(timezone.utc) - started).total_seconds(), 3)
            session_result: dict[str, Any] = {
                'query': query,
                'timestamp': timestamp,
                'session_id': session_id,
                'agent_responses': agent_responses,
                'arbiter_verdict': arbiter_verdict,
                'confidence_score': confidence_score,
                'elapsed_seconds': elapsed_seconds,
                'conflict_detected': conflict.conflict_detected,
                'conflict_summary': conflict.conflict_summary,
                'additional_research': conflict.additional_research,
                'agent_timings': agent_timings,
                'provider_meta': {
                    'research': conflict.additional_research_meta,
                    'arbiter': arbiter_meta,
                },
            }
            skill_path = self.skill_creator.maybe_create_skill(session_result)
            if skill_path:
                session_result['skill_path'] = skill_path
            # Extract DPO preference pairs from this session's debate
            dpo_pairs = extract_preference_pairs(session_result)
            if dpo_pairs:
                session_result['dpo_pairs_count'] = len(dpo_pairs)
                self._save_dpo_pairs(session_id, dpo_pairs)
            session_path = self.session_store.save_session(session_result)
            trajectory_count = self.trajectory_logger.log_session(session_result)
            self._append_log(
                f"{datetime.now(timezone.utc).isoformat()} | {session_id} | COMPLETE | "
                f"confidence={confidence_score} | conflict={conflict.conflict_detected} | "
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
                'agent_responses': {},
                'arbiter_verdict': f'[ERROR] {exc}',
                'confidence_score': -1,
                'elapsed_seconds': elapsed_seconds,
                'conflict_detected': False,
                'conflict_summary': 'Pipeline failed before conflict analysis.',
                'additional_research': None,
                'agent_timings': {},
            }

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

    def _build_arbiter_prompt(self, query: str, agent_responses: dict[str, str], conflict: Any) -> str:
        return build_arbiter_prompt(
            query=query,
            agent_responses=agent_responses,
            additional_research=conflict.additional_research,
        )

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


def run_sync(query: str, root: str | Path = '.') -> dict[str, Any]:
    orchestrator = MasterOrchestrator(root=root)
    return asyncio.run(orchestrator.run_query(query))
