"""
Web Evidence Gatherer
=====================
Uses DuckDuckGo search to gather real web evidence for council queries.
Skeptic and Oracle can cite actual URLs in their responses.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any


@dataclass
class EvidenceItem:
    title: str
    url: str
    snippet: str


@dataclass
class EvidenceBundle:
    general: list[EvidenceItem] = field(default_factory=list)
    counter: list[EvidenceItem] = field(default_factory=list)
    statistical: list[EvidenceItem] = field(default_factory=list)

    def format_for_role(self, role: str) -> str:
        sections: list[str] = []
        if role == 'skeptic':
            order = [('Counter-evidence', self.counter), ('General', self.general), ('Data', self.statistical)]
        elif role == 'oracle':
            order = [('Data & Research', self.statistical), ('General', self.general), ('Counter-evidence', self.counter)]
        else:
            order = [('General', self.general), ('Data & Research', self.statistical), ('Counter-evidence', self.counter)]

        for label, items in order:
            if not items:
                continue
            lines = [f'### {label}']
            for item in items[:4]:
                lines.append(f'- [{item.title}]({item.url}): {item.snippet[:200]}')
            sections.append('\n'.join(lines))

        return '\n\n'.join(sections) if sections else ''

    def to_dict(self) -> dict[str, Any]:
        def _items(lst: list[EvidenceItem]) -> list[dict[str, str]]:
            return [{'title': i.title, 'url': i.url, 'snippet': i.snippet} for i in lst]
        return {
            'general': _items(self.general),
            'counter': _items(self.counter),
            'statistical': _items(self.statistical),
        }

    def is_empty(self) -> bool:
        return not self.general and not self.counter and not self.statistical


def _extract_topic(query: str) -> str:
    import re
    cleaned = re.sub(r'^\s*(is|are|will|should|what|how|why|do|does|can|could)\s+', '', query.strip(), flags=re.IGNORECASE)
    return cleaned[:120].strip(' ?')


def _parse_results(raw_results: list[dict[str, str]]) -> list[EvidenceItem]:
    items: list[EvidenceItem] = []
    for r in raw_results:
        title = r.get('title', '').strip()
        url = r.get('href', r.get('link', '')).strip()
        snippet = r.get('body', r.get('snippet', '')).strip()
        if title and url:
            items.append(EvidenceItem(title=title, url=url, snippet=snippet))
    return items


async def _search(query: str, max_results: int = 5) -> list[dict[str, str]]:
    try:
        from duckduckgo_search import DDGS
        def _do() -> list[dict[str, str]]:
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=max_results))
        return await asyncio.wait_for(asyncio.to_thread(_do), timeout=10.0)
    except Exception:
        return []


class EvidenceGatherer:
    async def gather(self, query: str) -> EvidenceBundle:
        topic = _extract_topic(query)
        tasks = [
            _search(topic),
            _search(f'criticism risks problems {topic}'),
            _search(f'statistics data research {topic}'),
        ]
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
        except Exception:
            return EvidenceBundle()

        general = _parse_results(results[0]) if isinstance(results[0], list) else []
        counter = _parse_results(results[1]) if isinstance(results[1], list) else []
        statistical = _parse_results(results[2]) if isinstance(results[2], list) else []

        return EvidenceBundle(general=general, counter=counter, statistical=statistical)
