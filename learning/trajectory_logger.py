from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from agents import ALL_AGENTS

PROMPTS_BY_ROLE = {agent.role: agent.system_prompt for agent in ALL_AGENTS}


class TrajectoryLogger:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.trajectories_dir = self.root / 'trajectories'
        self.trajectories_dir.mkdir(parents=True, exist_ok=True)

    def log_session(self, session_result: dict[str, Any]) -> int:
        timestamp = datetime.fromisoformat(session_result['timestamp'])
        destination = self.trajectories_dir / f"{timestamp.date().isoformat()}.jsonl"
        trajectories = list(self._build_trajectories(session_result))
        with destination.open('a', encoding='utf-8') as handle:
            for trajectory in trajectories:
                handle.write(json.dumps(trajectory) + '\n')
        return len(trajectories)

    def _build_trajectories(self, session_result: dict[str, Any]):
        base_metadata = {
            'confidence_score': session_result.get('confidence_score', -1),
            'conflict_detected': session_result.get('conflict_detected', False),
            'final_verdict': session_result.get('arbiter_verdict', ''),
            'elapsed_seconds': session_result.get('elapsed_seconds', 0.0),
        }
        query = session_result['query']
        for role, response in session_result.get('agent_responses', {}).items():
            yield {
                'session_id': session_result['session_id'],
                'timestamp': session_result['timestamp'],
                'agent_role': role,
                'system_prompt': PROMPTS_BY_ROLE.get(role, ''),
                'user_query': query,
                'response': response,
                'metadata': base_metadata,
            }
        yield {
            'session_id': session_result['session_id'],
            'timestamp': session_result['timestamp'],
            'agent_role': 'arbiter',
            'system_prompt': PROMPTS_BY_ROLE['arbiter'],
            'user_query': query,
            'response': session_result.get('arbiter_verdict', ''),
            'metadata': base_metadata,
        }
