import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, AlertTriangle, Clock } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import Pill from '../ui/Pill'
import type { SessionSummary, SessionResult } from '../../api/types'
import { apiFetch } from '../../api/client'
import { useSessionStore } from '../../store/session'

interface SessionHistoryProps {
  sessions: SessionSummary[]
  loading: boolean
  onSearch: (q: string) => void
  onRefresh: () => void
}

export default function SessionHistory({ sessions, loading, onSearch, onRefresh }: SessionHistoryProps) {
  const { selectedSessionId, setSelectedSession, setCurrentSession } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [detail, setDetail] = useState<SessionResult | null>(null)

  useEffect(() => {
    const t = setTimeout(() => onSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery, onSearch])

  const loadDetail = async (id: string) => {
    setSelectedSession(id)
    try {
      const data = await apiFetch<SessionResult>(`/api/sessions/${id}`)
      setDetail(data)
      setCurrentSession(data)
    } catch {
      setDetail(null)
    }
  }

  const formatDate = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sessions..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50"
        />
      </div>

      {/* Session list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {loading && <p className="text-xs text-white/30 text-center py-4">Loading...</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-xs text-white/30 text-center py-8">No sessions yet. Run a query to get started.</p>
        )}
        {sessions.map((s, i) => (
          <motion.button
            key={s.session_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => loadDetail(s.session_id)}
            className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
              selectedSessionId === s.session_id
                ? 'bg-brand-500/10 border-brand-500/30'
                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
            }`}
          >
            <p className="text-sm text-white/80 line-clamp-2 leading-snug">{s.query}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-white/30 flex items-center gap-1">
                <Clock size={10} /> {formatDate(s.timestamp)}
              </span>
              <Pill variant={s.confidence_score >= 70 ? 'success' : s.confidence_score >= 40 ? 'warning' : 'danger'}>
                {s.confidence_score}%
              </Pill>
              {s.conflict_detected && (
                <AlertTriangle size={12} className="text-amber-400" />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Detail */}
      {detail && selectedSessionId && (
        <GlassCard className="p-4">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Session Detail</h4>
          <p className="text-sm text-white/80 mb-2">{detail.query}</p>
          <p className="text-xs text-white/50 leading-relaxed line-clamp-4">{detail.verdict}</p>
          <div className="flex items-center gap-2 mt-3">
            <Pill variant="info">{detail.confidence_score}%</Pill>
            <span className="text-[10px] text-white/30 font-mono">{detail.backend}</span>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
