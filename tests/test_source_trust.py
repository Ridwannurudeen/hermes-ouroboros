"""Tests for source trust — classification, scoring, explanation, fragile evidence."""
from __future__ import annotations

import pytest

from core.source_trust import (
    classify_domain,
    classify_recency,
    classify_source_type,
    compute_trust_score,
    count_corroboration,
    detect_fragile_evidence,
    enrich_sources,
    explain_trust_tier,
)


class TestClassifyDomain:
    @pytest.mark.parametrize('url,expected', [
        ('https://arxiv.org/abs/2301.01234', 'Academic'),
        ('https://www.nature.com/articles/xyz', 'Academic'),
        ('https://mit.edu/research', 'Academic'),
        ('https://cdc.gov/data', 'Government'),
        ('https://www.sec.gov/filings', 'Government'),
        ('https://reuters.com/article', 'Major News'),
        ('https://www.bbc.com/news', 'Major News'),
        ('https://medium.com/blog-post', 'Blog/Forum'),
        ('https://reddit.com/r/tech', 'Blog/Forum'),
        ('https://random-site.xyz', 'Unknown'),
    ])
    def test_known_tiers(self, url: str, expected: str) -> None:
        assert classify_domain(url) == expected

    def test_empty_url(self) -> None:
        assert classify_domain('') == 'Unknown'

    def test_invalid_url(self) -> None:
        assert classify_domain('not-a-url') == 'Unknown'


class TestClassifyRecency:
    def test_current_year(self) -> None:
        result = classify_recency('Published in 2026 data')
        assert result == 'Current'

    def test_recent(self) -> None:
        result = classify_recency('Data from 2024')
        assert result == 'Recent'

    def test_dated(self) -> None:
        result = classify_recency('Study from 2019')
        assert result == 'Dated'

    def test_no_year(self) -> None:
        result = classify_recency('No date mentioned here')
        assert result == 'Unknown'


class TestClassifySourceType:
    def test_academic_is_primary(self) -> None:
        result = classify_source_type('https://arxiv.org/abs/123', 'Our findings show...')
        assert result == 'primary'

    def test_government_is_primary(self) -> None:
        result = classify_source_type('https://cdc.gov/data', 'Official statistics')
        assert result == 'primary'

    def test_news_is_secondary(self) -> None:
        result = classify_source_type('https://reuters.com/article', 'Researchers found that...')
        assert result == 'secondary'

    def test_blog_is_commentary(self) -> None:
        result = classify_source_type('https://medium.com/post', 'My take on this')
        assert result == 'commentary'

    def test_reddit_is_commentary(self) -> None:
        result = classify_source_type('https://reddit.com/r/tech', 'I think this is wrong')
        assert result == 'commentary'

    def test_unknown_with_opinion_signals(self) -> None:
        result = classify_source_type('https://example.com', 'This is my opinion on the matter')
        assert result == 'commentary'

    def test_unknown_with_analysis_signals(self) -> None:
        result = classify_source_type('https://example.com', 'According to data, studies show improvement')
        assert result == 'secondary'

    def test_unknown_no_signals(self) -> None:
        result = classify_source_type('https://example.com', 'Some text here')
        assert result == 'unknown'


class TestComputeTrustScore:
    def test_max_score(self) -> None:
        score = compute_trust_score('Academic', 'Current', 5)
        assert score == 100

    def test_min_score(self) -> None:
        score = compute_trust_score('Blog/Forum', 'Dated', 0)
        assert score == 18  # 10 + 8 + 0

    def test_capped_at_100(self) -> None:
        score = compute_trust_score('Academic', 'Current', 100)
        assert score == 100

    def test_mid_range(self) -> None:
        score = compute_trust_score('Major News', 'Recent', 1)
        assert score == 58  # 28 + 20 + 10


class TestFragileEvidence:
    def test_single_source_fragile(self) -> None:
        result = detect_fragile_evidence([{'trust_tier': 'Academic', 'source_type': 'primary', 'trust_score': 80}])
        assert result['is_fragile'] is True
        assert result['single_source'] is True

    def test_low_trust_only_fragile(self) -> None:
        sources = [
            {'trust_tier': 'Blog/Forum', 'source_type': 'commentary', 'trust_score': 15},
            {'trust_tier': 'Unknown', 'source_type': 'unknown', 'trust_score': 20},
        ]
        result = detect_fragile_evidence(sources)
        assert result['is_fragile'] is True
        assert result['low_trust_only'] is True

    def test_no_primary_fragile(self) -> None:
        sources = [
            {'trust_tier': 'Major News', 'source_type': 'secondary', 'trust_score': 55},
            {'trust_tier': 'Blog/Forum', 'source_type': 'commentary', 'trust_score': 20},
        ]
        result = detect_fragile_evidence(sources)
        assert result['is_fragile'] is True
        assert result['no_primary'] is True

    def test_strong_evidence_not_fragile(self) -> None:
        sources = [
            {'trust_tier': 'Academic', 'source_type': 'primary', 'trust_score': 80},
            {'trust_tier': 'Government', 'source_type': 'primary', 'trust_score': 75},
            {'trust_tier': 'Major News', 'source_type': 'secondary', 'trust_score': 55},
        ]
        result = detect_fragile_evidence(sources)
        assert result['is_fragile'] is False

    def test_empty_sources(self) -> None:
        result = detect_fragile_evidence([])
        assert result['is_fragile'] is True


class TestEnrichSources:
    def test_none_input(self) -> None:
        assert enrich_sources(None) is None

    def test_adds_metadata(self) -> None:
        evidence = {
            'general': [{'url': 'https://arxiv.org/abs/123', 'title': 'Study 2026', 'snippet': 'Our findings show...'}],
            'counter': [],
            'statistical': [],
        }
        enriched = enrich_sources(evidence)
        item = enriched['general'][0]
        assert 'trust_tier' in item
        assert 'recency' in item
        assert 'trust_score' in item
        assert 'source_type' in item
        assert 'trust_explanation' in item

    def test_fragile_detection_included(self) -> None:
        evidence = {
            'general': [{'url': 'https://medium.com/post', 'title': 'Blog', 'snippet': 'My opinion'}],
            'counter': [],
            'statistical': [],
        }
        enriched = enrich_sources(evidence)
        assert 'overall_fragile' in enriched
        assert enriched['overall_fragile']['is_fragile'] is True


class TestExplainTrustTier:
    def test_academic_explanation(self) -> None:
        explanation = explain_trust_tier('https://arxiv.org/abs/123', 'Academic')
        assert 'academic' in explanation.lower() or 'peer-reviewed' in explanation.lower()

    def test_unknown_explanation(self) -> None:
        explanation = explain_trust_tier('https://random.xyz', 'Unknown')
        assert 'unclassified' in explanation.lower()
