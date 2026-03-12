import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FolderOpen, Pin, FileText, Clock, Trash2, ArrowLeft, StickyNote, Link } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import Pill from '../ui/Pill'
import { apiFetch, apiPost, apiDelete } from '../../api/client'
import type { Workspace } from '../../api/types'

type View = 'list' | 'detail' | 'create'

export default function WorkspacePanel() {
  const [view, setView] = useState<View>('list')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selected, setSelected] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [noteText, setNoteText] = useState('')

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<Workspace[]>('/api/workspaces')
      setWorkspaces(data)
    } catch { /* empty */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  const createWorkspace = async () => {
    if (!name.trim()) return
    try {
      const ws = await apiPost<Workspace>('/api/workspaces', { name, description: desc })
      setWorkspaces((prev) => [ws, ...prev])
      setName('')
      setDesc('')
      setView('list')
    } catch { /* empty */ }
  }

  const openDetail = async (id: string) => {
    try {
      const ws = await apiFetch<Workspace>(`/api/workspaces/${id}`)
      setSelected(ws)
      setView('detail')
    } catch { /* empty */ }
  }

  const deleteWorkspace = async (id: string) => {
    try {
      await apiDelete(`/api/workspaces/${id}`)
      setWorkspaces((prev) => prev.filter((w) => w.workspace_id !== id))
      if (selected?.workspace_id === id) {
        setSelected(null)
        setView('list')
      }
    } catch { /* empty */ }
  }

  const addNote = async () => {
    if (!selected || !noteText.trim()) return
    try {
      const ws = await apiPost<Workspace>(`/api/workspaces/${selected.workspace_id}/notes`, { text: noteText })
      setSelected(ws)
      setNoteText('')
    } catch { /* empty */ }
  }

  const deleteNote = async (noteId: string) => {
    if (!selected) return
    try {
      const ws = await apiDelete<Workspace>(`/api/workspaces/${selected.workspace_id}/notes/${noteId}`)
      setSelected(ws)
    } catch { /* empty */ }
  }

  const fmt = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  // --- List view ---
  if (view === 'list') {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white/80">Workspaces</h2>
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 text-xs font-medium hover:bg-cyan-500/25 transition-colors"
          >
            <Plus size={13} /> New
          </button>
        </div>

        {loading && <p className="text-xs text-white/30 text-center py-8">Loading...</p>}
        {!loading && workspaces.length === 0 && (
          <GlassCard className="p-8 text-center">
            <FolderOpen size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm text-white/30">No workspaces yet. Create one to organize your research.</p>
          </GlassCard>
        )}

        <div className="space-y-2">
          <AnimatePresence>
            {workspaces.map((ws, i) => (
              <motion.div
                key={ws.workspace_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() => openDetail(ws.workspace_id)}
                  className="w-full text-left p-4 rounded-xl border bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{ws.name}</p>
                      {ws.description && (
                        <p className="text-xs text-white/30 mt-0.5 line-clamp-1">{ws.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.workspace_id) }}
                      className="p-1 rounded text-white/10 hover:text-rose-400 transition-colors ml-2"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-white/20 flex items-center gap-1">
                      <Clock size={9} /> {fmt(ws.updated_at)}
                    </span>
                    <Pill variant="default">{ws.sessions.length} sessions</Pill>
                    <Pill variant="info">{ws.pinned_claims.length} claims</Pill>
                    <Pill variant="default">{ws.notes.length} notes</Pill>
                  </div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // --- Create view ---
  if (view === 'create') {
    return (
      <div className="space-y-4 max-w-md">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50 transition-colors">
          <ArrowLeft size={12} /> Back
        </button>
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70">Create Workspace</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
          />
          <button
            onClick={createWorkspace}
            disabled={!name.trim()}
            className="w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Create
          </button>
        </GlassCard>
      </div>
    )
  }

  // --- Detail view ---
  if (view === 'detail' && selected) {
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => { setView('list'); setSelected(null) }} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50 transition-colors">
          <ArrowLeft size={12} /> Back
        </button>

        <GlassCard className="p-5">
          <h3 className="text-base font-semibold text-white/80">{selected.name}</h3>
          {selected.description && <p className="text-xs text-white/30 mt-1">{selected.description}</p>}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] text-white/20">Created {fmt(selected.created_at)}</span>
            <span className="text-[10px] text-white/20">Updated {fmt(selected.updated_at)}</span>
          </div>
        </GlassCard>

        {/* Sessions */}
        <GlassCard className="p-4">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText size={11} /> Sessions ({selected.sessions.length})
          </h4>
          {selected.sessions.length === 0 ? (
            <p className="text-xs text-white/20">No sessions linked yet.</p>
          ) : (
            <div className="space-y-1">
              {selected.sessions.map((sid) => (
                <div key={sid} className="text-xs text-white/40 font-mono truncate">{sid}</div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Pinned Claims */}
        <GlassCard className="p-4">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Pin size={11} /> Pinned Claims ({selected.pinned_claims.length})
          </h4>
          {selected.pinned_claims.length === 0 ? (
            <p className="text-xs text-white/20">No pinned claims.</p>
          ) : (
            <div className="space-y-2">
              {selected.pinned_claims.map((c) => (
                <div key={c.claim_id} className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-white/60 line-clamp-2">{c.claim_text}</p>
                  {c.note && <p className="text-[10px] text-white/30 mt-1 italic">{c.note}</p>}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Pinned Evidence */}
        {selected.pinned_evidence.length > 0 && (
          <GlassCard className="p-4">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link size={11} /> Pinned Evidence ({selected.pinned_evidence.length})
            </h4>
            <div className="space-y-2">
              {selected.pinned_evidence.map((e) => (
                <div key={e.url} className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-white/60 truncate">{e.title || e.url}</p>
                  {e.trust_tier && <Pill variant="info">{e.trust_tier}</Pill>}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Notes */}
        <GlassCard className="p-4">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <StickyNote size={11} /> Notes ({selected.notes.length})
          </h4>
          <div className="space-y-2 mb-3">
            {selected.notes.map((n) => (
              <div key={n.note_id} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60">{n.text}</p>
                  <span className="text-[10px] text-white/20">{fmt(n.created_at)}</span>
                </div>
                <button onClick={() => deleteNote(n.note_id)} className="p-1 text-white/10 hover:text-rose-400 transition-colors shrink-0">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
            />
            <button
              onClick={addNote}
              disabled={!noteText.trim()}
              className="px-3 py-2 rounded-lg bg-cyan-500/15 text-cyan-400 text-xs font-medium hover:bg-cyan-500/25 disabled:opacity-30 transition-colors"
            >
              Add
            </button>
          </div>
        </GlassCard>
      </div>
    )
  }

  return null
}
