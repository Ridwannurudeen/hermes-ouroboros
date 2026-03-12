"""Extract atomic claims from Arbiter verdict text.

Prefers structured JSON claims emitted directly by the Arbiter (via
verdict_parser.extract_structured_claims). Falls back to regex-based
extraction if structured claims are unavailable.
"""

import re
from typing import Any

from core.verdict_parser import extract_structured_claims


# Hedging / weak support markers
WEAK_MARKERS = [
    r"\bmay\b", r"\bmight\b", r"\bcould\b", r"\bpossibly\b", r"\buncertain\b",
    r"\blimited evidence\b", r"\bsome suggest\b", r"\banecdotal\b",
    r"\bpreliminary\b", r"\bnot conclusive\b", r"\binsufficient\b",
    r"\bunclear\b", r"\bdebatable\b",
]

# Dispute / contradiction markers
DISPUTE_MARKERS = [
    r"\bhowever\b", r"\bcontradicts?\b", r"\bdisputed\b", r"\brefuted\b",
    r"\bcounterargument\b", r"\bcriticize[sd]?\b", r"\bcontroversial\b",
    r"\bopposing\b", r"\bchallenged?\b", r"\bdisproven\b", r"\bfailed to replicate\b",
    r"\bfalse\b", r"\bmisleading\b", r"\binaccurate\b",
]

# Strong support markers
STRONG_MARKERS = [
    r"\bconfirmed\b", r"\bestablished\b", r"\bwell-documented\b",
    r"\brobust evidence\b", r"\bmultiple studies\b", r"\bconsensus\b",
    r"\bstrong evidence\b", r"\bsupported by\b", r"\bdemonstrated\b",
    r"\bproven\b", r"\bverified\b", r"\breplicated\b",
]

# URL pattern
URL_PATTERN = re.compile(r'https?://[^\s\)\],"]+')


def extract_claims(arbiter_verdict: str, web_evidence: dict | None = None) -> list[dict[str, Any]]:
    """Parse arbiter verdict into atomic claims with status classification.

    Tries structured JSON claims from the arbiter first (higher quality).
    Falls back to regex-based extraction if structured claims are empty.

    Returns list of {claim, status, reasoning, source_url?, evidence_for?, evidence_against?, uncertainty?}
    """
    if not arbiter_verdict or len(arbiter_verdict) < 50:
        return []

    # --- Primary path: structured claims from arbiter JSON ---
    structured = extract_structured_claims(arbiter_verdict)
    if structured:
        source_urls = _build_source_index(web_evidence)
        claims = []
        for sc in structured:
            # Build reasoning from evidence lists
            reasoning_parts = []
            if sc.get('evidence_for'):
                reasoning_parts.append('Supporting: ' + '; '.join(sc['evidence_for']))
            if sc.get('evidence_against'):
                reasoning_parts.append('Contradicting: ' + '; '.join(sc['evidence_against']))
            if not reasoning_parts:
                reasoning_parts.append(_status_reasoning(sc['status']))

            source_url = _find_matching_source(sc['claim'], source_urls)
            claims.append({
                'claim': sc['claim'],
                'status': sc['status'],
                'reasoning': ' | '.join(reasoning_parts),
                'source_url': source_url,
                'evidence_for': sc.get('evidence_for', []),
                'evidence_against': sc.get('evidence_against', []),
                'uncertainty': sc.get('uncertainty', 50),
                'structured': True,
            })
        return claims

    # --- Fallback: regex-based extraction ---
    return _extract_claims_regex(arbiter_verdict, web_evidence)


def _status_reasoning(status: str) -> str:
    """Generate default reasoning text for a claim status."""
    return {
        'supported': 'Strong assertion backed by evidence markers or established consensus.',
        'disputed': 'Contains contradiction or dispute markers. Multiple agents flagged concerns.',
        'weakly_supported': 'Hedging language detected. Evidence exists but is not conclusive.',
        'insufficient_evidence': 'No clear evidence markers. Claim requires further verification.',
    }.get(status, 'Status determined by arbiter analysis.')


def _extract_claims_regex(arbiter_verdict: str, web_evidence: dict | None = None) -> list[dict[str, Any]]:
    """Regex-based claim extraction — legacy fallback."""
    # Build URL index from web evidence for source matching
    source_urls = _build_source_index(web_evidence)

    # Extract candidate claim sentences
    candidates = _extract_candidates(arbiter_verdict)

    # Score and classify each
    claims = []
    seen = set()
    for sentence in candidates:
        # Deduplicate similar claims
        key = sentence[:60].lower().strip()
        if key in seen:
            continue
        seen.add(key)

        status, reasoning = _classify_claim(sentence)
        source_url = _find_matching_source(sentence, source_urls)

        claims.append({
            "claim": sentence.strip(),
            "status": status,
            "reasoning": reasoning,
            "source_url": source_url,
            "structured": False,
        })

        if len(claims) >= 7:
            break

    return claims


_HEADER_PREFIXES = re.compile(
    r'^(?:VERDICT|HERMES\s+SCORE|CONFIDENCE|FATAL\s+FLAW|KEY\s+STRENGTH|FIX\s+OR\s+DIE|'
    r'THINKING\s+TRAP|BLIND\s+SPOT|PREMORTEM|SO\s+WHAT|KEY\s+EVIDENCE|MISSING\s+CONTEXT|'
    r'SOURCE\s+CREDIB|BULL\s+CASE\s+SUMM|BEAR\s+CASE\s+SUMM|KEY\s+UNCERTAIN|'
    r'DISSENTING|WHAT\s+WOULD\s+CHANGE|SURVIVAL\s+PROB|PROBABILITY\s+OF|FACTUAL\s+ACC|'
    r'MISLEADING|EVIDENCE\s+FOR|EVIDENCE\s+AGAINST|DATA\s+CONFIDENCE|CONTRARIAN)',
    re.IGNORECASE,
)


def _is_section_header(text: str) -> bool:
    """Check if text starts with a verdict section header."""
    return bool(_HEADER_PREFIXES.match(text.strip()))


def _extract_candidates(text: str) -> list[str]:
    """Extract claim-like sentences from verdict text."""
    candidates = []

    # Strategy 1: Look for numbered/bulleted claims
    bullet_patterns = [
        r'(?:^|\n)\s*[\d]+[\.\)]\s*(.+?)(?=\n\s*[\d]+[\.\)]|\n\n|$)',
        r'(?:^|\n)\s*[-•*]\s*(.+?)(?=\n\s*[-•*]|\n\n|$)',
    ]
    for pattern in bullet_patterns:
        matches = re.findall(pattern, text, re.DOTALL)
        for m in matches:
            clean = m.strip().replace('\n', ' ')
            if 40 <= len(clean) <= 400:
                candidates.append(clean)

    # Strategy 2: Look for sentences after key section headers
    section_headers = [
        r'(?:key evidence|evidence for|evidence against|key findings|main claims|assessment)',
        r'(?:bull case|bear case|strengths|weaknesses|risks|flaws)',
    ]
    for header_pat in section_headers:
        pattern = rf'(?i){header_pat}[:\s]*\n(.+?)(?=\n[A-Z#]|\n\n\n|$)'
        matches = re.findall(pattern, text, re.DOTALL)
        for block in matches:
            sentences = re.split(r'(?<=[.!])\s+', block)
            for s in sentences:
                clean = s.strip().replace('\n', ' ')
                if 40 <= len(clean) <= 400:
                    candidates.append(clean)

    # Strategy 3: Direct sentence extraction from full text
    if len(candidates) < 3:
        sentences = re.split(r'(?<=[.!])\s+', text)
        for s in sentences:
            clean = s.strip().replace('\n', ' ')
            # Filter for declarative claim-like sentences
            if 50 <= len(clean) <= 400 and _is_claim_like(clean):
                candidates.append(clean)

    # Deduplicate while preserving order, skip section headers
    seen = set()
    unique = []
    for c in candidates:
        if _is_section_header(c):
            continue
        norm = c[:50].lower()
        if norm not in seen:
            seen.add(norm)
            unique.append(c)

    return unique[:15]  # Pre-filter before classification


def _is_claim_like(sentence: str) -> bool:
    """Check if a sentence looks like a factual claim."""
    # Must start with uppercase
    if not sentence[0].isupper():
        return False
    # Must end with period or exclamation
    if not sentence.rstrip().endswith(('.', '!')):
        return False
    # Should contain substantive content
    claim_signals = [
        r'\d+%', r'\b\d+\b', r'\bstud', r'\bdata\b', r'\bevidence\b',
        r'\bresearch\b', r'\bshow[sn]?\b', r'\bfound\b', r'\bindicate',
        r'\bsuggest', r'\baccording\b', r'\breport', r'\banalysis\b',
        r'\brisk\b', r'\bimpact\b', r'\bgrowth\b', r'\bdecline\b',
        r'\bincreas', r'\bdecreas', r'\bmarket\b', r'\bsignificant',
    ]
    return any(re.search(p, sentence, re.IGNORECASE) for p in claim_signals)


def _classify_claim(sentence: str) -> tuple[str, str]:
    """Classify claim status and generate reasoning."""
    weak_count = sum(1 for p in WEAK_MARKERS if re.search(p, sentence, re.IGNORECASE))
    dispute_count = sum(1 for p in DISPUTE_MARKERS if re.search(p, sentence, re.IGNORECASE))
    strong_count = sum(1 for p in STRONG_MARKERS if re.search(p, sentence, re.IGNORECASE))

    if dispute_count >= 2 or (dispute_count >= 1 and strong_count == 0):
        return "disputed", "Contains contradiction or dispute markers. Multiple agents flagged concerns."
    elif weak_count >= 2 or (weak_count >= 1 and strong_count == 0 and dispute_count == 0):
        return "weakly_supported", "Hedging language detected. Evidence exists but is not conclusive."
    elif strong_count >= 1:
        return "supported", "Strong assertion backed by evidence markers or established consensus."
    else:
        # Default: look at sentence confidence
        has_numbers = bool(re.search(r'\d', sentence))
        has_source_ref = bool(re.search(r'(?:study|research|data|report|survey|analysis)', sentence, re.IGNORECASE))
        if has_numbers and has_source_ref:
            return "supported", "Contains specific data points and references empirical evidence."
        elif has_numbers or has_source_ref:
            return "weakly_supported", "Some supporting evidence referenced but not fully corroborated."
        else:
            return "insufficient_evidence", "No clear evidence markers. Claim requires further verification."


def _build_source_index(web_evidence: dict | None) -> list[dict]:
    """Build flat list of sources from web evidence."""
    if not web_evidence:
        return []
    sources = []
    for category in ("general", "counter", "statistical"):
        for item in web_evidence.get(category, []):
            if isinstance(item, dict) and item.get("url"):
                sources.append(item)
    return sources


def _find_matching_source(sentence: str, sources: list[dict]) -> str | None:
    """Find the most relevant source for a claim sentence."""
    # Check for inline URLs first
    url_match = URL_PATTERN.search(sentence)
    if url_match:
        return url_match.group(0)

    # Simple keyword overlap matching
    words = set(re.findall(r'\b\w{4,}\b', sentence.lower()))
    best_url = None
    best_score = 0

    for source in sources:
        title_words = set(re.findall(r'\b\w{4,}\b', (source.get("title", "") + " " + source.get("snippet", "")).lower()))
        overlap = len(words & title_words)
        if overlap > best_score and overlap >= 2:
            best_score = overlap
            best_url = source["url"]

    return best_url
