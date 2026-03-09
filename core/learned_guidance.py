from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is',
    'it', 'of', 'on', 'or', 'that', 'the', 'to', 'what', 'when', 'why', 'will', 'with',
}


@dataclass(frozen=True)
class SkillRecord:
    title: str
    when_to_use: str
    reasoning_pattern: str
    pitfalls: str


@dataclass(frozen=True)
class SessionRecord:
    query: str
    confidence_score: int
    conflict_summary: str
    verdict: str


class LearnedGuidanceLibrary:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self._skills = self._load_skills()
        self._sessions = self._load_sessions()

    def format_for_prompt(self, query: str, skill_limit: int = 2, session_limit: int = 2) -> str:
        skills = self._retrieve_skills(query, limit=skill_limit)
        sessions = self._retrieve_sessions(query, limit=session_limit)
        if not skills and not sessions:
            return 'No strongly relevant learned guidance was found.'

        blocks: list[str] = []
        if skills:
            skill_lines = ['Relevant learned skills:']
            for skill in skills:
                skill_lines.append(f'- {skill.title}')
                skill_lines.append(f'  Use when: {skill.when_to_use}')
                skill_lines.append(f'  Winning pattern: {skill.reasoning_pattern}')
                skill_lines.append(f'  Pitfall to avoid: {self._first_line(skill.pitfalls)}')
            blocks.append('\n'.join(skill_lines))
        if sessions:
            session_lines = ['Relevant prior investigations:']
            for session in sessions:
                session_lines.append(f'- Prior query: {session.query}')
                session_lines.append(f'  Winning verdict lesson: {self._first_sentence(session.verdict)}')
                if session.conflict_summary:
                    session_lines.append(f'  Conflict that mattered: {session.conflict_summary}')
            blocks.append('\n'.join(session_lines))
        return '\n\n'.join(blocks)

    def _retrieve_skills(self, query: str, limit: int) -> list[SkillRecord]:
        query_tokens = self._tokenize(query)
        scored: list[tuple[int, SkillRecord]] = []
        for skill in self._skills:
            score = (
                3 * self._overlap(query_tokens, self._tokenize(skill.title))
                + 2 * self._overlap(query_tokens, self._tokenize(skill.when_to_use))
                + self._overlap(query_tokens, self._tokenize(skill.reasoning_pattern))
            )
            if score > 0:
                scored.append((score, skill))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [skill for _, skill in scored[:limit]]

    def _retrieve_sessions(self, query: str, limit: int) -> list[SessionRecord]:
        query_tokens = self._tokenize(query)
        scored: list[tuple[int, SessionRecord]] = []
        for session in self._sessions:
            score = (
                3 * self._overlap(query_tokens, self._tokenize(session.query))
                + 2 * self._overlap(query_tokens, self._tokenize(session.conflict_summary))
                + self._overlap(query_tokens, self._tokenize(session.verdict))
                + max(0, session.confidence_score - 70)
            )
            if score > 0:
                scored.append((score, session))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [session for _, session in scored[:limit]]

    def _load_skills(self) -> list[SkillRecord]:
        skills_dir = self.root / 'skills'
        if not skills_dir.exists():
            return []
        skills: list[SkillRecord] = []
        for path in sorted(skills_dir.glob('auto_*.md')):
            text = path.read_text(encoding='utf-8')
            sections = self._parse_sections(text)
            title = text.splitlines()[0].replace('# Skill:', '').strip() if text.splitlines() else path.stem
            skills.append(
                SkillRecord(
                    title=title,
                    when_to_use=sections.get('When to use this skill', ''),
                    reasoning_pattern=sections.get('Key reasoning pattern', ''),
                    pitfalls=sections.get('Pitfalls to avoid', ''),
                )
            )
        return skills

    def _load_sessions(self) -> list[SessionRecord]:
        sessions_dir = self.root / 'sessions'
        if not sessions_dir.exists():
            return []
        sessions: list[SessionRecord] = []
        for path in sorted(sessions_dir.glob('*.json')):
            data = json.loads(path.read_text(encoding='utf-8'))
            confidence = int(data.get('confidence_score', -1))
            verdict = str(data.get('arbiter_verdict', ''))
            if confidence < 75 or verdict.startswith('[ERROR]'):
                continue
            sessions.append(
                SessionRecord(
                    query=str(data.get('query', '')),
                    confidence_score=confidence,
                    conflict_summary=str(data.get('conflict_summary', '')),
                    verdict=verdict,
                )
            )
        return sessions

    def _parse_sections(self, text: str) -> dict[str, str]:
        sections: dict[str, list[str]] = {}
        current: str | None = None
        for line in text.splitlines():
            if line.startswith('## '):
                current = line[3:].strip()
                sections[current] = []
                continue
            if current is not None:
                sections[current].append(line)
        return {key: '\n'.join(value).strip() for key, value in sections.items()}

    def _tokenize(self, text: str) -> set[str]:
        return {token for token in re.findall(r'[a-z0-9][a-z0-9\-\+]*', text.lower()) if token not in STOPWORDS}

    def _overlap(self, left: set[str], right: set[str]) -> int:
        return len(left & right)

    def _first_sentence(self, text: str) -> str:
        cleaned = re.sub(r'\s+', ' ', text).strip()
        if not cleaned:
            return ''
        parts = re.split(r'(?<=[.!?])\s+', cleaned)
        for part in parts:
            if len(part) >= 40:
                return part
        return parts[0]

    def _first_line(self, text: str) -> str:
        for line in text.splitlines():
            cleaned = line.strip().lstrip('-').strip()
            if cleaned:
                return cleaned
        return ''
