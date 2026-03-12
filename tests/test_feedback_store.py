"""Tests for feedback store — event system, outcomes, claims, stats."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from core.feedback_store import FeedbackStore


@pytest.fixture()
def store(tmp_path: Path) -> FeedbackStore:
    return FeedbackStore(str(tmp_path))


class TestRating:
    def test_save_positive_rating(self, store: FeedbackStore) -> None:
        data = store.save_feedback('s1', 1, ['actionable'])
        assert data['rating'] == 1
        assert 'actionable' in data['tags']
        assert len(data['events']) == 1
        assert data['events'][0]['type'] == 'rating'

    def test_save_negative_rating(self, store: FeedbackStore) -> None:
        data = store.save_feedback('s1', -1, ['too vague'])
        assert data['rating'] == -1
        assert data['events'][0]['rating'] == -1

    def test_invalid_rating_raises(self, store: FeedbackStore) -> None:
        with pytest.raises(ValueError):
            store.save_feedback('s1', 5)

    def test_invalid_tags_filtered(self, store: FeedbackStore) -> None:
        data = store.save_feedback('s1', 1, ['actionable', 'invalid_tag', 'best answer'])
        assert 'invalid_tag' not in data['tags']
        assert 'actionable' in data['tags']

    def test_multiple_ratings_append(self, store: FeedbackStore) -> None:
        store.save_feedback('s1', 1)
        data = store.save_feedback('s1', -1)
        rating_events = [e for e in data['events'] if e['type'] == 'rating']
        assert len(rating_events) == 2


class TestOutcome:
    def test_record_outcome(self, store: FeedbackStore) -> None:
        store.save_feedback('s1', 1)
        data = store.record_outcome('s1', 'confirmed', 'Was correct')
        assert data['latest_outcome'] == 'confirmed'
        outcome_events = [e for e in data['events'] if e['type'] == 'outcome']
        assert len(outcome_events) == 1
        assert outcome_events[0]['note'] == 'Was correct'

    def test_invalid_outcome_raises(self, store: FeedbackStore) -> None:
        with pytest.raises(ValueError):
            store.record_outcome('s1', 'invalid_outcome')


class TestClaimFeedback:
    def test_record_claim_feedback(self, store: FeedbackStore) -> None:
        data = store.record_claim_feedback('s1', 'claim-1', 'The sky claim', 'confirmed', 'Verified')
        assert data['claim_outcomes']['claim-1'] == 'confirmed'
        cf_events = [e for e in data['events'] if e['type'] == 'claim_feedback']
        assert len(cf_events) == 1
        assert cf_events[0]['claim_id'] == 'claim-1'

    def test_invalid_claim_outcome_raises(self, store: FeedbackStore) -> None:
        with pytest.raises(ValueError):
            store.record_claim_feedback('s1', 'c1', 'text', 'invalid')


class TestNote:
    def test_add_note(self, store: FeedbackStore) -> None:
        data = store.add_note('s1', 'This is a note')
        note_events = [e for e in data['events'] if e['type'] == 'note']
        assert len(note_events) == 1
        assert note_events[0]['text'] == 'This is a note'

    def test_empty_note_raises(self, store: FeedbackStore) -> None:
        with pytest.raises(ValueError):
            store.add_note('s1', '')


class TestStats:
    def test_stats_positive_rate(self, store: FeedbackStore) -> None:
        store.save_feedback('s1', 1)
        store.save_feedback('s2', -1)
        store.save_feedback('s3', 1)
        stats = store.get_stats()
        assert stats['total_rated'] == 3
        assert stats['positive'] == 2
        assert stats['negative'] == 1
        assert stats['positive_rate'] == pytest.approx(66.7, abs=0.1)

    def test_stats_uses_last_rating_per_session(self, store: FeedbackStore) -> None:
        """When a user re-rates a session, stats should use the last rating."""
        store.save_feedback('s1', 1)
        store.save_feedback('s1', -1)  # Changed mind
        stats = store.get_stats()
        assert stats['total_rated'] == 1
        assert stats['positive'] == 0
        assert stats['negative'] == 1

    def test_stats_counts_outcomes(self, store: FeedbackStore) -> None:
        store.record_outcome('s1', 'confirmed')
        store.record_outcome('s2', 'refuted')
        stats = store.get_stats()
        assert stats['outcome_counts']['confirmed'] == 1
        assert stats['outcome_counts']['refuted'] == 1

    def test_stats_counts_notes(self, store: FeedbackStore) -> None:
        store.add_note('s1', 'Note 1')
        store.add_note('s1', 'Note 2')
        stats = store.get_stats()
        assert stats['notes_count'] == 2


class TestLegacyMigration:
    def test_old_format_migrated(self, store: FeedbackStore) -> None:
        # Manually write old-format data
        fb_dir = Path(store.feedback_dir)
        fb_dir.mkdir(parents=True, exist_ok=True)
        old_data = {
            'session_id': 's1',
            'rating': 1,
            'tags': ['actionable'],
            'timestamp': '2026-03-01T00:00:00Z',
        }
        (fb_dir / 's1.json').write_text(json.dumps(old_data), encoding='utf-8')

        # Load triggers migration
        data = store.get_feedback('s1')
        assert 'events' in data
        assert len(data['events']) == 1
        assert data['events'][0]['type'] == 'rating'
        assert data['events'][0]['rating'] == 1


class TestPersistence:
    def test_feedback_survives_reload(self, tmp_path: Path) -> None:
        store1 = FeedbackStore(str(tmp_path))
        store1.save_feedback('s1', 1, ['best answer'])
        store1.record_outcome('s1', 'confirmed')

        store2 = FeedbackStore(str(tmp_path))
        data = store2.get_feedback('s1')
        assert data['rating'] == 1
        assert data['latest_outcome'] == 'confirmed'
        assert len(data['events']) == 2
