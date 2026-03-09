from __future__ import annotations

import re
from pathlib import Path
from typing import Any


class SkillCreator:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.skills_dir = self.root / 'skills'
        self.skills_dir.mkdir(parents=True, exist_ok=True)

    def maybe_create_skill(self, session_result: dict[str, Any]) -> str | None:
        confidence = int(session_result.get('confidence_score', -1))
        conflict_detected = bool(session_result.get('conflict_detected', False))
        if confidence < 75 or not conflict_detected:
            return None

        session_id = str(session_result.get('session_id', 'unknown'))
        destination = self.skills_dir / f'auto_{session_id[:8]}.md'
        content = self._render_skill(session_result)
        destination.write_text(content, encoding='utf-8')
        return str(destination)

    def _render_skill(self, session_result: dict[str, Any]) -> str:
        query = str(session_result.get('query', ''))
        verdict = str(session_result.get('arbiter_verdict', ''))
        conflict_summary = str(session_result.get('conflict_summary', ''))
        additional_research = str(session_result.get('additional_research') or '')
        oracle = str(session_result.get('agent_responses', {}).get('oracle', ''))
        skeptic = str(session_result.get('agent_responses', {}).get('skeptic', ''))

        topic = self._infer_topic(query)
        evidence_block = self._pick_evidence(additional_research or oracle)
        pitfalls = self._pick_pitfalls(conflict_summary, skeptic)
        reasoning_pattern = self._first_meaningful_sentence(verdict) or conflict_summary or query

        return (
            f'# Skill: Reasoning about {topic}\n'
            '## When to use this skill\n'
            f'When asked about {self._topic_keywords(query, topic)}\n'
            '## Key reasoning pattern\n'
            f'{reasoning_pattern}\n'
            '## Evidence that matters\n'
            f'{evidence_block}\n'
            '## Pitfalls to avoid\n'
            f'{pitfalls}\n'
        )

    def _infer_topic(self, query: str) -> str:
        lowered = query.lower()
        topics = (
            ('DeFi and crypto markets', ('defi', 'bitcoin', 'ethereum', 'solana', 'crypto', 'nft', 'rollup')),
            ('AI and software', ('ai', 'agent', 'software', 'engineer', 'model', 'llm')),
            ('Macroeconomics and markets', ('fed', 'rates', 'dollar', 'reserve currency', 'inflation', 'economy')),
            ('Security and infrastructure', ('audit', 'security', 'wallet', 'encryption', 'smart contract')),
        )
        for label, keywords in topics:
            if any(keyword in lowered for keyword in keywords):
                return label
        trimmed = re.sub(r'^\s*(is|are|will|should|what|how|why)\s+', '', query.strip(), flags=re.IGNORECASE)
        return trimmed[:60].strip(' ?') or 'complex questions'

    def _topic_keywords(self, query: str, topic: str) -> str:
        words = re.findall(r'[A-Za-z0-9][A-Za-z0-9\-\+]*', query.lower())
        stopwords = {'is', 'are', 'the', 'a', 'an', 'of', 'to', 'in', 'at', 'and', 'or', 'by', 'for', 'what'}
        keywords = [word for word in words if word not in stopwords][:6]
        if keywords:
            return ', '.join(keywords)
        return topic.lower()

    def _pick_evidence(self, source: str) -> str:
        lines = self._meaningful_lines(source)
        if not lines:
            return 'Use current factual evidence, explicit tradeoffs, and independent confirmation before deciding.'
        return '\n'.join(f'- {line}' for line in lines[:3])

    def _pick_pitfalls(self, conflict_summary: str, skeptic: str) -> str:
        lines = self._meaningful_lines(f'{conflict_summary}\n{skeptic}')
        if not lines:
            return '- Avoid treating one bullish narrative as proof.\n- Avoid skipping downside and dependency analysis.'
        selected = lines[:2]
        if conflict_summary:
            selected.insert(0, conflict_summary)
        return '\n'.join(f'- {line}' for line in selected[:3])

    def _first_meaningful_sentence(self, text: str) -> str:
        cleaned = re.sub(r'\s+', ' ', text).strip()
        if not cleaned:
            return ''
        sentences = re.split(r'(?<=[.!?])\s+', cleaned)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) >= 40:
                return sentence
        return sentences[0].strip() if sentences else ''

    def _meaningful_lines(self, text: str) -> list[str]:
        lines: list[str] = []
        for raw_line in text.splitlines():
            line = raw_line.strip().lstrip('-').strip()
            if len(line) < 20:
                continue
            if line.lower().startswith(('confidence', 'verdict', 'key disagreements', 'dissenting views')):
                continue
            lines.append(line)
        return lines
