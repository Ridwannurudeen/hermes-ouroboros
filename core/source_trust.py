"""Lightweight source trust layer — domain tier + recency + corroboration.

Each source gets a trust explanation string that explains WHY it received
its trust tier, recency label, and corroboration score.
"""

import re
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Any


# Domain tier classification
ACADEMIC_DOMAINS = {
    '.edu', '.ac.uk', '.ac.jp', 'arxiv.org', 'scholar.google.com',
    'nature.com', 'science.org', 'sciencedirect.com', 'springer.com',
    'wiley.com', 'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov',
    'pnas.org', 'cell.com', 'thelancet.com', 'bmj.com', 'nejm.org',
    'jstor.org', 'researchgate.net', 'ieee.org', 'acm.org',
    'ssrn.com', 'biorxiv.org', 'medrxiv.org',
}

GOVERNMENT_DOMAINS = {
    '.gov', '.gov.uk', '.gov.au', '.gc.ca',
    'who.int', 'un.org', 'worldbank.org', 'imf.org',
    'europa.eu', 'oecd.org', 'cdc.gov', 'nih.gov',
    'fda.gov', 'sec.gov', 'federalreserve.gov', 'bls.gov',
    'census.gov',
}

MAJOR_NEWS_DOMAINS = {
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
    'nytimes.com', 'washingtonpost.com', 'wsj.com', 'ft.com',
    'economist.com', 'theguardian.com', 'bloomberg.com',
    'cnbc.com', 'cnn.com', 'aljazeera.com', 'npr.org',
    'politico.com', 'arstechnica.com', 'wired.com',
    'techcrunch.com', 'theverge.com', 'forbes.com',
    'statista.com', 'pew.org', 'pewresearch.org',
}

# Year extraction pattern
YEAR_PATTERN = re.compile(r'\b(20[0-2]\d)\b')


def classify_domain(url: str) -> str:
    """Classify a URL into a domain tier."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ''
    except Exception:
        return 'Unknown'

    # Check suffix-based tiers
    for suffix in ACADEMIC_DOMAINS:
        if suffix.startswith('.'):
            if hostname.endswith(suffix):
                return 'Academic'
        elif hostname == suffix or hostname.endswith('.' + suffix):
            return 'Academic'

    for suffix in GOVERNMENT_DOMAINS:
        if suffix.startswith('.'):
            if hostname.endswith(suffix):
                return 'Government'
        elif hostname == suffix or hostname.endswith('.' + suffix):
            return 'Government'

    for domain in MAJOR_NEWS_DOMAINS:
        if hostname == domain or hostname.endswith('.' + domain):
            return 'Major News'

    # Heuristic: check for blog/forum patterns
    blog_patterns = ['medium.com', 'substack.com', 'wordpress.com', 'blogspot.com',
                     'reddit.com', 'quora.com', 'stackoverflow.com', 'twitter.com',
                     'x.com', 'facebook.com', 'linkedin.com']
    for pattern in blog_patterns:
        if hostname == pattern or hostname.endswith('.' + pattern):
            return 'Blog/Forum'

    return 'Unknown'


def classify_recency(snippet: str, title: str = '') -> str:
    """Estimate recency from text content."""
    text = (snippet or '') + ' ' + (title or '')
    years = YEAR_PATTERN.findall(text)
    if not years:
        return 'Unknown'

    latest = max(int(y) for y in years)
    current_year = datetime.now(timezone.utc).year

    diff = current_year - latest
    if diff <= 1:
        return 'Current'
    elif diff <= 3:
        return 'Recent'
    else:
        return 'Dated'


def count_corroboration(source: dict, all_sources: list[dict]) -> int:
    """Count how many other sources share key terms with this source."""
    my_words = set(re.findall(r'\b\w{5,}\b', (source.get('snippet', '') + ' ' + source.get('title', '')).lower()))
    if len(my_words) < 3:
        return 0

    count = 0
    my_url = source.get('url', '')
    for other in all_sources:
        if other.get('url') == my_url:
            continue
        other_words = set(re.findall(r'\b\w{5,}\b', (other.get('snippet', '') + ' ' + other.get('title', '')).lower()))
        overlap = len(my_words & other_words)
        if overlap >= 3:
            count += 1
    return count


def explain_trust_tier(url: str, tier: str) -> str:
    """Explain WHY a source received its trust tier."""
    try:
        hostname = urlparse(url).hostname or url
    except Exception:
        hostname = url

    explanations = {
        'Academic': f'{hostname} is an academic/research domain — peer-reviewed sources have the highest credibility.',
        'Government': f'{hostname} is a government/institutional domain — official data sources are considered highly authoritative.',
        'Major News': f'{hostname} is a major news outlet — professional editorial standards and fact-checking processes.',
        'Blog/Forum': f'{hostname} is a blog/forum/social platform — user-generated content with no editorial oversight.',
        'Unknown': f'{hostname} is an unclassified source — credibility cannot be determined from domain alone.',
    }
    return explanations.get(tier, f'{hostname}: unclassified source.')


def explain_recency(recency: str, snippet: str = '', title: str = '') -> str:
    """Explain WHY a source received its recency label."""
    text = (snippet or '') + ' ' + (title or '')
    years = YEAR_PATTERN.findall(text)
    latest = max((int(y) for y in years), default=None)

    if recency == 'Current':
        return f'References {latest} data — within the past year, highly current.'
    elif recency == 'Recent':
        return f'References {latest} data — within 3 years, reasonably current.'
    elif recency == 'Dated':
        return f'References {latest} data — older than 3 years, may be outdated.'
    return 'No date references found — recency cannot be determined.'


def explain_corroboration(count: int) -> str:
    """Explain corroboration score."""
    if count == 0:
        return 'No other sources share significant content overlap — this claim stands alone.'
    elif count == 1:
        return '1 other source covers similar ground — limited cross-reference.'
    else:
        return f'{count} other sources share key terms — well-corroborated across multiple references.'


def build_trust_explanation(item: dict[str, Any]) -> str:
    """Build a complete trust explanation string for a source."""
    parts = []
    tier = item.get('trust_tier', 'Unknown')
    url = item.get('url', '')
    parts.append(explain_trust_tier(url, tier))
    recency = item.get('recency', 'Unknown')
    parts.append(explain_recency(recency, item.get('snippet', ''), item.get('title', '')))
    corr = item.get('corroboration', 0)
    parts.append(explain_corroboration(corr))
    return ' '.join(parts)


def compute_trust_score(tier: str, recency: str, corroboration: int) -> int:
    """Compute a 0-100 trust score from the three signals."""
    tier_scores = {'Academic': 40, 'Government': 38, 'Major News': 28, 'Blog/Forum': 10, 'Unknown': 15}
    recency_scores = {'Current': 30, 'Recent': 20, 'Dated': 8, 'Unknown': 12}
    corr_score = min(corroboration * 10, 30)
    return min(100, tier_scores.get(tier, 15) + recency_scores.get(recency, 12) + corr_score)


def enrich_sources(web_evidence: dict[str, Any] | None) -> dict[str, Any] | None:
    """Add trust metadata and explanations to all sources in a web evidence dict."""
    if not web_evidence:
        return web_evidence

    # Build flat list of all sources for corroboration counting
    all_sources = []
    for category in ('general', 'counter', 'statistical'):
        for item in web_evidence.get(category, []):
            if isinstance(item, dict):
                all_sources.append(item)

    enriched = {}
    for category in ('general', 'counter', 'statistical'):
        items = web_evidence.get(category, [])
        enriched_items = []
        for item in items:
            if not isinstance(item, dict):
                enriched_items.append(item)
                continue
            enriched_item = dict(item)
            tier = classify_domain(item.get('url', ''))
            recency = classify_recency(item.get('snippet', ''), item.get('title', ''))
            corr = count_corroboration(item, all_sources)
            enriched_item['trust_tier'] = tier
            enriched_item['recency'] = recency
            enriched_item['corroboration'] = corr
            enriched_item['trust_score'] = compute_trust_score(tier, recency, corr)
            enriched_item['trust_explanation'] = build_trust_explanation(enriched_item)
            enriched_items.append(enriched_item)
        enriched[category] = enriched_items

    return enriched
