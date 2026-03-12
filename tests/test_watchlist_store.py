"""Tests for watchlist store — watch/unwatch, refresh, change tracking."""
from __future__ import annotations

from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest

from core.watchlist_store import WatchlistStore


@pytest.fixture()
def store(tmp_path: Path) -> WatchlistStore:
    return WatchlistStore(tmp_path)


class TestWatchUnwatch:
    def test_watch_claim(self, store: WatchlistStore) -> None:
        record = store.watch('claim-1', 'The sky is blue', 'supported', 75)
        assert record['claim_id'] == 'claim-1'
        assert record['claim_text'] == 'The sky is blue'
        assert record['initial_status'] == 'supported'
        assert record['latest_score'] == 75
        assert store.is_watched('claim-1')

    def test_watch_duplicate_returns_existing(self, store: WatchlistStore) -> None:
        store.watch('claim-1', 'Text A')
        record = store.watch('claim-1', 'Text B')
        assert record['claim_text'] == 'Text A'  # original preserved

    def test_unwatch_claim(self, store: WatchlistStore) -> None:
        store.watch('claim-1', 'Text')
        assert store.unwatch('claim-1') is True
        assert not store.is_watched('claim-1')

    def test_unwatch_nonexistent(self, store: WatchlistStore) -> None:
        assert store.unwatch('claim-1') is False


class TestListAndGet:
    def test_list_watched(self, store: WatchlistStore) -> None:
        store.watch('c1', 'Claim 1')
        store.watch('c2', 'Claim 2')
        items = store.list_watched()
        assert len(items) == 2

    def test_list_filtered_by_user(self, store: WatchlistStore) -> None:
        store.watch('c1', 'Claim 1', user_id='user-a')
        store.watch('c2', 'Claim 2', user_id='user-b')
        items = store.list_watched(user_id='user-a')
        assert len(items) == 1
        assert items[0]['claim_id'] == 'c1'

    def test_get_watched(self, store: WatchlistStore) -> None:
        store.watch('c1', 'Claim 1')
        record = store.get_watched('c1')
        assert record is not None
        assert record['claim_id'] == 'c1'

    def test_get_watched_nonexistent(self, store: WatchlistStore) -> None:
        assert store.get_watched('c1') is None


class TestRefresh:
    def _mock_claim_store(self, claims: dict[str, dict[str, Any]]) -> MagicMock:
        mock = MagicMock()
        mock.get_claim.side_effect = lambda cid: claims.get(cid)
        return mock

    def test_refresh_detects_status_change(self, store: WatchlistStore) -> None:
        store.watch('c1', 'Claim 1', current_status='supported')
        claim_store = self._mock_claim_store({
            'c1': {
                'latest_status': 'disputed',
                'appearances': 3,
                'last_seen': '2026-03-12',
                'sessions': ['s1', 's2'],
                'status_history': [{'hermes_score': 45}],
            }
        })
        changed = store.refresh_from_claim_store(claim_store)
        assert len(changed) == 1
        assert changed[0]['from_status'] == 'supported'
        assert changed[0]['to_status'] == 'disputed'

        record = store.get_watched('c1')
        assert record['latest_status'] == 'disputed'
        assert record['change_count'] == 1

    def test_refresh_no_change(self, store: WatchlistStore) -> None:
        store.watch('c1', 'Claim 1', current_status='supported')
        claim_store = self._mock_claim_store({
            'c1': {
                'latest_status': 'supported',
                'appearances': 1,
                'last_seen': '2026-03-12',
                'sessions': ['s1'],
                'status_history': [],
            }
        })
        changed = store.refresh_from_claim_store(claim_store)
        assert len(changed) == 0

    def test_refresh_missing_claim(self, store: WatchlistStore) -> None:
        store.watch('c1', 'Claim 1')
        claim_store = self._mock_claim_store({})  # claim not in store
        changed = store.refresh_from_claim_store(claim_store)
        assert len(changed) == 0


class TestStats:
    def test_stats_empty(self, store: WatchlistStore) -> None:
        stats = store.get_stats()
        assert stats['total_watched'] == 0

    def test_stats_with_data(self, store: WatchlistStore) -> None:
        store.watch('c1', 'Claim 1', current_status='supported')
        store.watch('c2', 'Claim 2', current_status='disputed')
        stats = store.get_stats()
        assert stats['total_watched'] == 2
        assert stats['status_breakdown']['supported'] == 1
        assert stats['status_breakdown']['disputed'] == 1


class TestPersistence:
    def test_data_survives_reload(self, tmp_path: Path) -> None:
        store1 = WatchlistStore(tmp_path)
        store1.watch('c1', 'Persist me', 'supported', 80)

        store2 = WatchlistStore(tmp_path)
        assert store2.is_watched('c1')
        record = store2.get_watched('c1')
        assert record['claim_text'] == 'Persist me'
