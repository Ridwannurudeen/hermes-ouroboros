"""Tests for verdict parser — structured claim extraction."""
from __future__ import annotations

import pytest

from core.verdict_parser import extract_structured_claims, parse_verdict


class TestExtractStructuredClaims:
    def test_valid_json_claims(self) -> None:
        verdict = '''
Some analysis text here.

CLAIMS: [
  {
    "claim": "The sky is blue",
    "status": "supported",
    "evidence_for": ["Rayleigh scattering data"],
    "evidence_against": [],
    "uncertainty": 10
  },
  {
    "claim": "The moon is made of cheese",
    "status": "disputed",
    "evidence_for": [],
    "evidence_against": ["NASA samples"],
    "uncertainty": 95
  }
]
'''
        claims = extract_structured_claims(verdict)
        assert len(claims) == 2
        assert claims[0]['claim'] == 'The sky is blue'
        assert claims[0]['status'] == 'supported'
        assert claims[1]['status'] == 'disputed'

    def test_no_claims_section(self) -> None:
        verdict = 'Just a plain verdict with no CLAIMS section.'
        claims = extract_structured_claims(verdict)
        assert claims == []

    def test_invalid_json(self) -> None:
        verdict = 'CLAIMS: [not valid json at all'
        claims = extract_structured_claims(verdict)
        assert claims == []

    def test_caps_at_seven(self) -> None:
        items = [
            {'claim': f'Claim {i}', 'status': 'supported', 'evidence_for': [], 'evidence_against': [], 'uncertainty': 50}
            for i in range(10)
        ]
        import json
        verdict = f'CLAIMS: {json.dumps(items)}'
        claims = extract_structured_claims(verdict)
        assert len(claims) <= 7

    def test_invalid_status_remapped(self) -> None:
        import json
        items = [
            {'claim': 'This is a valid claim with enough text', 'status': 'supported', 'evidence_for': [], 'evidence_against': [], 'uncertainty': 50},
            {'claim': 'This is an invalid status claim text', 'status': 'bogus_status', 'evidence_for': [], 'evidence_against': [], 'uncertainty': 50},
        ]
        verdict = f'CLAIMS: {json.dumps(items)}'
        claims = extract_structured_claims(verdict)
        assert len(claims) == 2
        assert claims[0]['status'] == 'supported'
        assert claims[1]['status'] == 'insufficient_evidence'  # remapped

    def test_uncertainty_clamped(self) -> None:
        import json
        items = [
            {'claim': 'This is a long enough claim for testing', 'status': 'supported', 'evidence_for': [], 'evidence_against': [], 'uncertainty': 150},
        ]
        verdict = f'CLAIMS: {json.dumps(items)}'
        claims = extract_structured_claims(verdict)
        assert claims[0]['uncertainty'] == 100


class TestParseVerdict:
    def test_extracts_hermes_score(self) -> None:
        verdict = '''
VERDICT: PROMISING BUT FRAGILE
HERMES SCORE: 62/100
CONFIDENCE: 70%
'''
        result = parse_verdict(verdict)
        assert result.get('hermes_score') == 62
        assert result.get('confidence') == 70

    def test_extracts_verdict_label(self) -> None:
        verdict = 'VERDICT: STRONGLY SUPPORTED\nHERMES SCORE: 85/100'
        result = parse_verdict(verdict)
        assert result.get('verdict_label') == 'STRONGLY SUPPORTED'
