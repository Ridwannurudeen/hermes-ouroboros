"""Tests for the persistent claim store — canonical IDs, indexing, search."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from core.claim_store import ClaimStore


@pytest.fixture()
def store(tmp_path: Path) -> ClaimStore:
    return ClaimStore(tmp_path)


class TestCanonicalId:
    def test_same_text_same_id(self, store: ClaimStore) -> None:
        id1 = store._canonical_id("The sky is blue")
        id2 = store._canonical_id("The sky is blue")
        assert id1 == id2

    def test_case_insensitive(self, store: ClaimStore) -> None:
        id1 = store._canonical_id("The Sky Is Blue")
        id2 = store._canonical_id("the sky is blue")
        assert id1 == id2

    def test_whitespace_collapse(self, store: ClaimStore) -> None:
        id1 = store._canonical_id("The  sky   is blue")
        id2 = store._canonical_id("The sky is blue")
        assert id1 == id2

    def test_punctuation_stripped(self, store: ClaimStore) -> None:
        id1 = store._canonical_id("The sky is blue!")
        id2 = store._canonical_id("The sky is blue")
        assert id1 == id2

    def test_different_text_different_id(self, store: ClaimStore) -> None:
        id1 = store._canonical_id("The sky is blue")
        id2 = store._canonical_id("The grass is green")
        assert id1 != id2


class TestIndexing:
    def test_index_session_creates_records(self, store: ClaimStore) -> None:
        session = {
            'session_id': 'sess-1',
            'claim_breakdown': [
                {'claim': 'The sky is blue', 'status': 'supported'},
                {'claim': 'Water is wet', 'status': 'disputed'},
            ],
        }
        ids = store.index_session_claims(session)
        assert len(ids) == 2
        for cid in ids:
            record = store.get_claim(cid)
            assert record is not None
            assert 'sess-1' in record['sessions']

    def test_repeat_session_increments_appearances(self, store: ClaimStore) -> None:
        for sid in ('sess-1', 'sess-2'):
            store.index_session_claims({
                'session_id': sid,
                'claim_breakdown': [{'claim': 'The sky is blue', 'status': 'supported'}],
            })
        cid = store.index_session_claims({
            'session_id': 'sess-3',
            'claim_breakdown': [{'claim': 'The sky is blue', 'status': 'supported'}],
        })[0]
        record = store.get_claim(cid)
        assert record['appearances'] == 3
        assert len(record['sessions']) == 3

    def test_status_history_tracked(self, store: ClaimStore) -> None:
        store.index_session_claims({
            'session_id': 'sess-1',
            'claim_breakdown': [{'claim': 'The economy will grow next year', 'status': 'supported'}],
        })
        store.index_session_claims({
            'session_id': 'sess-2',
            'claim_breakdown': [{'claim': 'The economy will grow next year', 'status': 'disputed'}],
        })
        cid = list(store._index.keys())[0]
        record = store.get_claim(cid)
        assert len(record['status_history']) == 2
        assert record['status_history'][0]['status'] == 'supported'
        assert record['status_history'][1]['status'] == 'disputed'
        assert record['latest_status'] == 'disputed'

    def test_empty_breakdown_no_op(self, store: ClaimStore) -> None:
        ids = store.index_session_claims({'session_id': 's1', 'claim_breakdown': []})
        assert ids == []

    def test_missing_breakdown_no_op(self, store: ClaimStore) -> None:
        ids = store.index_session_claims({'session_id': 's1'})
        assert ids == []


class TestSearch:
    def test_search_finds_matching(self, store: ClaimStore) -> None:
        store.index_session_claims({
            'session_id': 's1',
            'claim_breakdown': [
                {'claim': 'Bitcoin will reach 100k', 'status': 'supported'},
                {'claim': 'Ethereum is undervalued', 'status': 'disputed'},
            ],
        })
        results = store.search_claims('bitcoin')
        assert len(results) == 1
        assert 'bitcoin' in results[0]['text'].lower()

    def test_search_empty_query(self, store: ClaimStore) -> None:
        results = store.search_claims('')
        assert results == []


class TestRecurring:
    def test_recurring_filters_by_min(self, store: ClaimStore) -> None:
        for i in range(3):
            store.index_session_claims({
                'session_id': f's{i}',
                'claim_breakdown': [{'claim': 'Recurring claim', 'status': 'supported'}],
            })
        store.index_session_claims({
            'session_id': 'sx',
            'claim_breakdown': [{'claim': 'One-time claim', 'status': 'supported'}],
        })
        recurring = store.get_recurring_claims(min_appearances=2)
        assert len(recurring) == 1
        assert recurring[0]['appearances'] >= 2


class TestPersistence:
    def test_data_survives_reload(self, tmp_path: Path) -> None:
        store1 = ClaimStore(tmp_path)
        store1.index_session_claims({
            'session_id': 's1',
            'claim_breakdown': [{'claim': 'Persist me', 'status': 'supported'}],
        })
        cid = list(store1._index.keys())[0]

        store2 = ClaimStore(tmp_path)
        assert store2.get_claim(cid) is not None
        assert store2.get_claim(cid)['text'] == 'Persist me'
