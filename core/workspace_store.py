"""Workspace / Project system — durable analyst workspaces.

A workspace groups sessions, pinned claims, pinned evidence, and notes
into a persistent research context.  This is the retention layer that
turns Hermes from a session tool into a persistent intelligence platform.

Storage layout:
  workspaces/
    {workspace_id}.json   — individual workspace records
"""
from __future__ import annotations

import json
import secrets
import time
from pathlib import Path
from typing import Any


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _gen_id() -> str:
    return secrets.token_urlsafe(12)


class WorkspaceStore:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.workspaces_dir = self.root / 'workspaces'
        self.workspaces_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def create_workspace(
        self,
        name: str,
        description: str = '',
        owner_user_id: str | None = None,
    ) -> dict[str, Any]:
        """Create a new workspace."""
        if not name or not name.strip():
            raise ValueError('Workspace name is required.')

        workspace_id = _gen_id()
        workspace: dict[str, Any] = {
            'workspace_id': workspace_id,
            'name': name.strip()[:100],
            'description': description.strip()[:500],
            'owner_user_id': owner_user_id,
            'created_at': _now_iso(),
            'updated_at': _now_iso(),
            'sessions': [],
            'pinned_claims': [],
            'pinned_evidence': [],
            'notes': [],
        }
        self._save(workspace_id, workspace)
        return workspace

    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        """Retrieve a workspace by ID."""
        return self._load(workspace_id)

    def list_workspaces(
        self,
        owner_user_id: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """List workspaces, optionally filtered by owner. Most recent first."""
        workspaces = []
        for path in sorted(
            self.workspaces_dir.glob('*.json'),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        ):
            ws = self._load_path(path)
            if ws is None:
                continue
            if owner_user_id and ws.get('owner_user_id') != owner_user_id:
                continue
            workspaces.append(ws)
            if len(workspaces) >= limit:
                break
        return workspaces

    def update_workspace(
        self,
        workspace_id: str,
        name: str | None = None,
        description: str | None = None,
    ) -> dict[str, Any] | None:
        """Update workspace name/description."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        if name is not None:
            ws['name'] = name.strip()[:100]
        if description is not None:
            ws['description'] = description.strip()[:500]
        ws['updated_at'] = _now_iso()
        self._save(workspace_id, ws)
        return ws

    def delete_workspace(self, workspace_id: str) -> bool:
        """Delete a workspace."""
        path = self.workspaces_dir / f'{workspace_id}.json'
        if path.exists():
            path.unlink()
            return True
        return False

    # ------------------------------------------------------------------
    # Session association
    # ------------------------------------------------------------------

    def add_session(self, workspace_id: str, session_id: str) -> dict[str, Any] | None:
        """Associate a session with this workspace."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        if session_id not in ws['sessions']:
            ws['sessions'].append(session_id)
            ws['updated_at'] = _now_iso()
            self._save(workspace_id, ws)
        return ws

    def remove_session(self, workspace_id: str, session_id: str) -> dict[str, Any] | None:
        """Remove a session from this workspace."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        if session_id in ws['sessions']:
            ws['sessions'].remove(session_id)
            ws['updated_at'] = _now_iso()
            self._save(workspace_id, ws)
        return ws

    # ------------------------------------------------------------------
    # Pinned claims
    # ------------------------------------------------------------------

    def pin_claim(
        self,
        workspace_id: str,
        claim_id: str,
        claim_text: str = '',
        note: str = '',
    ) -> dict[str, Any] | None:
        """Pin a claim to this workspace."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        # Deduplicate by claim_id
        existing_ids = {c['claim_id'] for c in ws['pinned_claims']}
        if claim_id not in existing_ids:
            ws['pinned_claims'].append({
                'claim_id': claim_id,
                'claim_text': claim_text[:300],
                'note': note[:500],
                'pinned_at': _now_iso(),
            })
            ws['updated_at'] = _now_iso()
            self._save(workspace_id, ws)
        return ws

    def unpin_claim(self, workspace_id: str, claim_id: str) -> dict[str, Any] | None:
        """Unpin a claim from this workspace."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        ws['pinned_claims'] = [c for c in ws['pinned_claims'] if c['claim_id'] != claim_id]
        ws['updated_at'] = _now_iso()
        self._save(workspace_id, ws)
        return ws

    # ------------------------------------------------------------------
    # Pinned evidence
    # ------------------------------------------------------------------

    def pin_evidence(
        self,
        workspace_id: str,
        url: str,
        title: str = '',
        trust_tier: str = '',
        note: str = '',
    ) -> dict[str, Any] | None:
        """Pin a piece of evidence (source URL) to this workspace."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        existing_urls = {e['url'] for e in ws['pinned_evidence']}
        if url not in existing_urls:
            ws['pinned_evidence'].append({
                'url': url,
                'title': title[:200],
                'trust_tier': trust_tier,
                'note': note[:500],
                'pinned_at': _now_iso(),
            })
            ws['updated_at'] = _now_iso()
            self._save(workspace_id, ws)
        return ws

    def unpin_evidence(self, workspace_id: str, url: str) -> dict[str, Any] | None:
        """Unpin evidence from this workspace."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        ws['pinned_evidence'] = [e for e in ws['pinned_evidence'] if e['url'] != url]
        ws['updated_at'] = _now_iso()
        self._save(workspace_id, ws)
        return ws

    # ------------------------------------------------------------------
    # Notes
    # ------------------------------------------------------------------

    def add_note(self, workspace_id: str, text: str) -> dict[str, Any] | None:
        """Add a note to this workspace."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        if not text.strip():
            return ws
        ws['notes'].append({
            'note_id': _gen_id(),
            'text': text.strip()[:2000],
            'created_at': _now_iso(),
        })
        ws['updated_at'] = _now_iso()
        self._save(workspace_id, ws)
        return ws

    def delete_note(self, workspace_id: str, note_id: str) -> dict[str, Any] | None:
        """Delete a note from this workspace."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        ws['notes'] = [n for n in ws['notes'] if n['note_id'] != note_id]
        ws['updated_at'] = _now_iso()
        self._save(workspace_id, ws)
        return ws

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def get_summary(self, workspace_id: str) -> dict[str, Any] | None:
        """Get workspace summary stats."""
        ws = self._load(workspace_id)
        if ws is None:
            return None
        return {
            'workspace_id': workspace_id,
            'name': ws['name'],
            'description': ws['description'],
            'session_count': len(ws['sessions']),
            'pinned_claims_count': len(ws['pinned_claims']),
            'pinned_evidence_count': len(ws['pinned_evidence']),
            'notes_count': len(ws['notes']),
            'created_at': ws['created_at'],
            'updated_at': ws['updated_at'],
        }

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _load(self, workspace_id: str) -> dict[str, Any] | None:
        path = self.workspaces_dir / f'{workspace_id}.json'
        return self._load_path(path)

    def _load_path(self, path: Path) -> dict[str, Any] | None:
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            return None

    def _save(self, workspace_id: str, data: dict[str, Any]) -> None:
        path = self.workspaces_dir / f'{workspace_id}.json'
        path.write_text(json.dumps(data, indent=2, default=str), encoding='utf-8')
