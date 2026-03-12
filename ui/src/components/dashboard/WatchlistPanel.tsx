import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, RefreshCw, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import Pill from '../ui/Pill'
import { apiFetch, apiPost } from '../../api/client'
import type { WatchedClaim, WatchlistStats, WatchChange } from '../../api/types'

const STATUS_PILL: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  supported: 'success',
  weakly_supported: 'warning',
  disputed: 'danger',
  insufficient_evidence: 'default',
}

export default function WatchlistPanel() {
  const [items, setItems] = useState<WatchedClaim[]>([])
  const [stats, setStats] = useState<WatchlistStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ watched: WatchedClaim[]; total: number }>('/api/watchlist')
      setItems(data.watched)
    } catch { /* empty */ }
    setLoading(false)
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<WatchlistStats>('/api/watchlist/stats')
      setStats(data)
    } catch { /* empty */ }
  }, [])

  useEffect(() => { fetchList(); fetchStats() }, [fetchList, fetchStats])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const data = await apiPost<{ changed: unknown[]; total_changed: number }>('/api/watchlist/refresh', {})
      if (data.total_changed > 0) {
        await fetchList()
      }
    } catch { /* empty */ }
    setRefreshing(false)
    fetchStats()
  }

  const unwatch = async (claimId: string) => {
    try {
      await apiPost('/api/watchlist/unwatch', { claim_id: claimId })
      setItems((prev) => prev.filter((i) => i.claim_id !== claimId))
      fetchStats()
    } catch { /* empty */ }
  }

  const fmt = (ts: string) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const scoreDelta = (item: WatchedClaim) => {
    if (item.initial_score == null || item.latest_score == null) return null
    return item.latest_score - item.initial_score
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/80">Watchlist</h2>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 text-xs font-medium hover:bg-cyan-500/25 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats bar */}
      {stats && stats.total_watched > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <p className="text-lg font-bold text-white/70">{stats.total_watched}</p>
            <p className="text-[10px] text-white/25">Watched</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <p className="text-lg font-bold text-amber-400/80">{stats.claims_with_changes}</p>
            <p className="text-[10px] text-white/25">Changed</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <div className="flex items-center justify-center gap-1">
              {Object.entries(stats.status_breakdown).slice(0, 3).map(([s, c]) => (
                <Pill key={s} variant={STATUS_PILL[s] || 'default'}>{c}</Pill>
              ))}
            </div>
            <p className="text-[10px] text-white/25 mt-1">By Status</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {loading && <p className="text-xs text-white/30 text-center py-8">Loading...</p>}
      {!loading && items.length === 0 && (
        <GlassCard className="p-8 text-center">
          <Eye size={32} className="mx-auto text-white/10 mb-3" />
          <p className="text-sm text-white/30">No watched claims yet.</p>
          <p className="text-xs text-white/20 mt-1">Claims will appear here when you watch them from the claim store.</p>
        </GlassCard>
      )}

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((item, i) => {
            const delta = scoreDelta(item)
            const expanded = expandedId === item.claim_id
            return (
              <motion.div
                key={item.claim_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border bg-white/[0.03] border-white/5 hover:border-white/10 transition-all duration-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : item.claim_id)}
                  className="w-full text-left p-4"
                >
                  <p className="text-sm text-white/70 line-clamp-2 leading-snug">{item.claim_text || item.claim_id}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Pill variant={STATUS_PILL[item.latest_status] || 'default'}>
                      {item.latest_status || 'unknown'}
                    </Pill>
                    {item.latest_score != null && (
                      <Pill variant={item.latest_score >= 60 ? 'success' : item.latest_score >= 35 ? 'warning' : 'danger'}>
                        Score: {item.latest_score}
                      </Pill>
                    )}
                    {delta != null && delta !== 0 && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-medium ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                    {delta === 0 && item.initial_score != null && (
                      <span className="flex items-center gap-0.5 text-[10px] text-white/20">
                        <Minus size={10} /> stable
                      </span>
                    )}
                    {item.change_count > 0 && (
                      <span className="text-[10px] text-amber-400/70">{item.change_count} change{item.change_count > 1 ? 's' : ''}</span>
                    )}
                    <span className="text-[10px] text-white/15 flex items-center gap-0.5 ml-auto">
                      <Clock size={9} /> {fmt(item.last_checked)}
                    </span>
                  </div>
                </button>

                {/* Expanded: change history */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/30 uppercase tracking-wider">Change History</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); unwatch(item.claim_id) }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-white/20 hover:text-rose-400 transition-colors"
                          >
                            <EyeOff size={10} /> Unwatch
                          </button>
                        </div>

                        {item.changes.length === 0 ? (
                          <p className="text-xs text-white/20">No status changes recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {item.changes.map((c: WatchChange, ci: number) => (
                              <div key={ci} className="flex items-center gap-2 text-xs">
                                <span className="text-white/20 text-[10px] font-mono min-w-[100px]">{fmt(c.timestamp)}</span>
                                <Pill variant={STATUS_PILL[c.from_status] || 'default'}>{c.from_status}</Pill>
                                <span className="text-white/15">&rarr;</span>
                                <Pill variant={STATUS_PILL[c.to_status] || 'default'}>{c.to_status}</Pill>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                          <div>
                            <span className="text-[10px] text-white/20">Watched since</span>
                            <p className="text-xs text-white/40">{fmt(item.watched_at)}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-white/20">Appearances</span>
                            <p className="text-xs text-white/40">{item.appearances ?? '—'}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
