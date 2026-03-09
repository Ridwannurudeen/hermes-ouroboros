from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Any


class TelegramDelivery:
    def format_primary_message(self, session_result: dict[str, Any]) -> str:
        verdict_line = self._extract_verdict_line(session_result.get('arbiter_verdict', ''))
        advocate = session_result.get('agent_responses', {}).get('advocate', '').replace('\n', ' ')
        skeptic = session_result.get('agent_responses', {}).get('skeptic', '').replace('\n', ' ')
        conflict_summary = session_result.get('conflict_summary') or 'Agents largely aligned'
        return (
            'HERMES COUNCIL VERDICT\n\n'
            f"Query: {session_result.get('query', '')}\n\n"
            '--------------------\n'
            f'VERDICT: {verdict_line[:180]}\n\n'
            f"Confidence: {session_result.get('confidence_score', -1)}/100\n\n"
            f'Key Conflict: {conflict_summary}\n\n'
            '--------------------\n'
            f'Advocate: {advocate[:50]}...\n'
            f'Skeptic: {skeptic[:50]}...\n\n'
            f"Session: {session_result.get('session_id', '')[:8]}\n"
            f"Time: {session_result.get('elapsed_seconds', 0.0):.1f}s"
        )

    def format_follow_up_message(self, session_result: dict[str, Any]) -> str:
        return session_result.get('arbiter_verdict', 'No verdict available.')

    def send_message(self, bot_token: str, chat_id: str, text: str) -> dict[str, Any]:
        payload = urllib.parse.urlencode({'chat_id': chat_id, 'text': text}).encode('utf-8')
        request = urllib.request.Request(
            url=f'https://api.telegram.org/bot{bot_token}/sendMessage',
            data=payload,
            method='POST',
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))

    def _extract_verdict_line(self, verdict: str) -> str:
        lines = [line.strip() for line in verdict.splitlines() if line.strip()]
        for index, line in enumerate(lines):
            if line.lower() == 'verdict:' and index + 1 < len(lines):
                return lines[index + 1]
        return lines[0] if lines else 'Verdict unavailable.'
