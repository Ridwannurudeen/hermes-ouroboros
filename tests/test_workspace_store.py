"""Tests for workspace store — CRUD, sessions, pinned items, notes."""
from __future__ import annotations

from pathlib import Path

import pytest

from core.workspace_store import WorkspaceStore


@pytest.fixture()
def store(tmp_path: Path) -> WorkspaceStore:
    return WorkspaceStore(tmp_path)


class TestCRUD:
    def test_create_workspace(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test Workspace', 'A test')
        assert ws['name'] == 'Test Workspace'
        assert ws['description'] == 'A test'
        assert ws['workspace_id']
        assert ws['sessions'] == []

    def test_create_requires_name(self, store: WorkspaceStore) -> None:
        with pytest.raises(ValueError):
            store.create_workspace('')

    def test_get_workspace(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        loaded = store.get_workspace(ws['workspace_id'])
        assert loaded is not None
        assert loaded['name'] == 'Test'

    def test_get_missing_workspace(self, store: WorkspaceStore) -> None:
        assert store.get_workspace('nonexistent') is None

    def test_list_workspaces(self, store: WorkspaceStore) -> None:
        store.create_workspace('A')
        store.create_workspace('B')
        all_ws = store.list_workspaces()
        assert len(all_ws) == 2

    def test_update_workspace(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Old Name')
        updated = store.update_workspace(ws['workspace_id'], name='New Name')
        assert updated['name'] == 'New Name'

    def test_delete_workspace(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Delete Me')
        assert store.delete_workspace(ws['workspace_id']) is True
        assert store.get_workspace(ws['workspace_id']) is None

    def test_delete_missing_workspace(self, store: WorkspaceStore) -> None:
        assert store.delete_workspace('nonexistent') is False


class TestSessions:
    def test_add_session(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        updated = store.add_session(ws['workspace_id'], 'sess-1')
        assert 'sess-1' in updated['sessions']

    def test_add_duplicate_session(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        store.add_session(ws['workspace_id'], 'sess-1')
        updated = store.add_session(ws['workspace_id'], 'sess-1')
        assert updated['sessions'].count('sess-1') == 1

    def test_remove_session(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        store.add_session(ws['workspace_id'], 'sess-1')
        updated = store.remove_session(ws['workspace_id'], 'sess-1')
        assert 'sess-1' not in updated['sessions']


class TestPinnedClaims:
    def test_pin_claim(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        updated = store.pin_claim(ws['workspace_id'], 'claim-1', 'The sky is blue', 'Important')
        assert len(updated['pinned_claims']) == 1
        assert updated['pinned_claims'][0]['claim_id'] == 'claim-1'

    def test_pin_duplicate_claim(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        store.pin_claim(ws['workspace_id'], 'claim-1', 'Text')
        updated = store.pin_claim(ws['workspace_id'], 'claim-1', 'Text')
        assert len(updated['pinned_claims']) == 1

    def test_unpin_claim(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        store.pin_claim(ws['workspace_id'], 'claim-1', 'Text')
        updated = store.unpin_claim(ws['workspace_id'], 'claim-1')
        assert len(updated['pinned_claims']) == 0


class TestNotes:
    def test_add_note(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        updated = store.add_note(ws['workspace_id'], 'This is a note')
        assert len(updated['notes']) == 1
        assert updated['notes'][0]['text'] == 'This is a note'

    def test_add_empty_note(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        updated = store.add_note(ws['workspace_id'], '   ')
        assert len(updated['notes']) == 0

    def test_delete_note(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test')
        updated = store.add_note(ws['workspace_id'], 'Delete me')
        note_id = updated['notes'][0]['note_id']
        updated = store.delete_note(ws['workspace_id'], note_id)
        assert len(updated['notes']) == 0


class TestSummary:
    def test_get_summary(self, store: WorkspaceStore) -> None:
        ws = store.create_workspace('Test', 'Description')
        store.add_session(ws['workspace_id'], 'sess-1')
        store.pin_claim(ws['workspace_id'], 'c1', 'Claim')
        store.add_note(ws['workspace_id'], 'Note')
        summary = store.get_summary(ws['workspace_id'])
        assert summary['session_count'] == 1
        assert summary['pinned_claims_count'] == 1
        assert summary['notes_count'] == 1

    def test_summary_missing_workspace(self, store: WorkspaceStore) -> None:
        assert store.get_summary('nonexistent') is None


class TestPersistence:
    def test_data_survives_reload(self, tmp_path: Path) -> None:
        store1 = WorkspaceStore(tmp_path)
        ws = store1.create_workspace('Persistent')
        store1.add_note(ws['workspace_id'], 'Test note')

        store2 = WorkspaceStore(tmp_path)
        loaded = store2.get_workspace(ws['workspace_id'])
        assert loaded is not None
        assert loaded['name'] == 'Persistent'
        assert len(loaded['notes']) == 1
