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
    source_type = item.get('source_type', '')
    if source_type:
        type_labels = {
            'primary': 'Primary source (original data/research).',
            'secondary': 'Secondary source (analysis/reporting).',
            'commentary': 'Commentary (opinion/editorial).',
            'unknown': 'Source type could not be determined.',
        }
        parts.append(type_labels.get(source_type, ''))
    return ' '.join(p for p in parts if p)


def compute_trust_score(tier: str, recency: str, corroboration: int) -> int:
    """Compute a 0-100 trust score from the three signals."""
    tier_scores = {'Academic': 40, 'Government': 38, 'Major News': 28, 'Blog/Forum': 10, 'Unknown': 15}
    recency_scores = {'Current': 30, 'Recent': 20, 'Dated': 8, 'Unknown': 12}
    corr_score = min(corroboration * 10, 30)
    return min(100, tier_scores.get(tier, 15) + recency_scores.get(recency, 12) + corr_score)


def classify_source_type(url: str, snippet: str = '', title: str = '') -> str:
    """Classify a source as primary, secondary, commentary, or unknown.

    - primary: raw data, datasets, original research, official statistics
    - secondary: analysis/synthesis of primary sources (news articles, reviews)
    - commentary: opinion, editorial, blog posts, social media, forums
    - unknown: cannot determine
    """
    tier = classify_domain(url)
    text = ((snippet or '') + ' ' + (title or '')).lower()

    # Commentary signals (check first — blogs/forums are always commentary)
    if tier == 'Blog/Forum':
        return 'commentary'

    commentary_signals = [
        'opinion', 'editorial', 'op-ed', 'my take', 'i think', 'i believe',
        'hot take', 'commentary', 'perspective', 'column', 'review',
    ]
    if any(s in text for s in commentary_signals):
        return 'commentary'

    # Primary signals — data, research, official reports
    primary_signals = [
        'dataset', 'raw data', 'original research', 'study finds',
        'we conducted', 'our findings', 'survey results', 'census',
        'clinical trial', 'experiment', 'peer-reviewed', 'peer reviewed',
        'white paper', 'whitepaper', 'technical report', 'specification',
        'annual report', 'quarterly report', 'official statistics',
        'press release', 'data release',
    ]
    if tier in ('Academic', 'Government') and any(s in text for s in primary_signals):
        return 'primary'

    # Academic/government without explicit primary signals → still likely primary
    if tier == 'Academic':
        return 'primary'
    if tier == 'Government':
        return 'primary'

    # Major news → secondary (analysis/reporting on primary sources)
    if tier == 'Major News':
        return 'secondary'

    # Unknown tier — try to detect analysis patterns
    secondary_signals = [
        'according to', 'report shows', 'analysis', 'researchers found',
        'studies show', 'data suggests', 'experts say',
    ]
    if any(s in text for s in secondary_signals):
        return 'secondary'

    return 'unknown'


def detect_fragile_evidence(sources: list[dict[str, Any]]) -> dict[str, Any]:
    """Detect fragile evidence patterns across a set of sources.

    Returns a dict with:
    - is_fragile: bool — overall fragility flag
    - reasons: list of strings explaining why
    - single_source: bool — only one source supports the claim
    - low_trust_only: bool — all sources are low-trust tier
    - conflicting_strong: bool — strong sources disagree
    """
    if not sources:
        return {'is_fragile': True, 'reasons': ['No sources provided.'], 'single_source': True, 'low_trust_only': True, 'conflicting_strong': False}

    reasons: list[str] = []
    tiers = [s.get('trust_tier', 'Unknown') for s in sources]
    source_types = [s.get('source_type', 'unknown') for s in sources]
    trust_scores = [s.get('trust_score', 0) for s in sources]

    single_source = len(sources) == 1
    if single_source:
        reasons.append('Only one source — no independent corroboration.')

    high_trust_tiers = {'Academic', 'Government'}
    low_trust_only = all(t not in high_trust_tiers for t in tiers)
    if low_trust_only and len(sources) > 0:
        reasons.append('No academic or government sources — relies entirely on lower-trust domains.')

    no_primary = 'primary' not in source_types
    if no_primary and len(sources) > 0:
        reasons.append('No primary sources — all evidence is secondary, commentary, or unclassified.')

    # Conflicting strong sources: general vs counter evidence with high trust
    conflicting_strong = False
    avg_score = sum(trust_scores) / len(trust_scores) if trust_scores else 0

    all_low_score = all(s <= 35 for s in trust_scores)
    if all_low_score and len(sources) > 1:
        reasons.append(f'All sources score below 35 (avg: {avg_score:.0f}) — weak evidence base.')

    is_fragile = single_source or low_trust_only or no_primary or all_low_score

    return {
        'is_fragile': is_fragile,
        'reasons': reasons,
        'single_source': single_source,
        'low_trust_only': low_trust_only,
        'no_primary': no_primary,
        'conflicting_strong': conflicting_strong,
    }


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
            enriched_item['source_type'] = classify_source_type(
                item.get('url', ''), item.get('snippet', ''), item.get('title', ''),
            )
            enriched_item['trust_explanation'] = build_trust_explanation(enriched_item)
            enriched_items.append(enriched_item)
        enriched[category] = enriched_items

    # Fragile evidence detection per category and overall
    all_enriched = []
    for category in ('general', 'counter', 'statistical'):
        cat_items = enriched.get(category, [])
        if cat_items:
            fragile = detect_fragile_evidence(cat_items)
            enriched[f'{category}_fragile'] = fragile
            all_enriched.extend(cat_items)

    if all_enriched:
        overall = detect_fragile_evidence(all_enriched)
        # Check for conflicting strong sources between general and counter
        gen_items = enriched.get('general', [])
        ctr_items = enriched.get('counter', [])
        strong_gen = [s for s in gen_items if isinstance(s, dict) and s.get('trust_score', 0) >= 60]
        strong_ctr = [s for s in ctr_items if isinstance(s, dict) and s.get('trust_score', 0) >= 60]
        if strong_gen and strong_ctr:
            overall['conflicting_strong'] = True
            overall['reasons'].append(
                f'{len(strong_gen)} strong supporting source(s) vs {len(strong_ctr)} strong counter source(s) — high-trust sources disagree.'
            )
            overall['is_fragile'] = True
        enriched['overall_fragile'] = overall

    return enriched
