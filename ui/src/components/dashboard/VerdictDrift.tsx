import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitCompare, TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { apiFetch } from '../../api/client'
import type { DriftAnalysis, DriftEntry } from '../../api/types'

interface VerdictDriftProps {
  sessionId: string
}

const STATUS_COLORS: Record<string, string> = {
  supported: 'bg-emerald-500/20 text-emerald-300',
  weakly_supported: 'bg-amber-500/20 text-amber-300',
  disputed: 'bg-rose-500/20 text-rose-300',
  insufficient_evidence: 'bg-white/10 text-white/40',
}

function ScoreDelta({ current, past, direction }: {
  current: number; past: number; direction?: string
}) {
  const delta = current - past
  const icon = direction === 'improved'
    ? <TrendingUp size={14} className="text-emerald-400" />
    : direction === 'declined'
      ? <TrendingDown size={14} className="text-rose-400" />
      : <Minus size={14} className="text-white/30" />

  const color = direction === 'improved'
    ? 'text-emerald-400'
    : direction === 'declined'
      ? 'text-rose-400'
      : 'text-white/40'

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <span className="text-[9px] uppercase tracking-wider text-white/25 mb-1">Before</span>
        <span className="text-lg font-bold text-white/40">{past >= 0 ? past : '?'}</span>
      </div>
      <div className="flex flex-col items-center">
        {icon}
        <span className={`text-xs font-bold ${color}`}>
          {delta > 0 ? `+${delta}` : delta === 0 ? '0' : delta}
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[9px] uppercase tracking-wider text-white/25 mb-1">Now</span>
        <span className="text-lg font-bold text-white/90">{current >= 0 ? current : '?'}</span>
      </div>
    </div>
  )
}

function LabelChange({ past, current }: { past: string; current: string }) {
  if (!past || !current || past === current) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/30 px-2 py-1 rounded bg-white/[0.04] line-through">{past}</span>
      <ArrowRight size={12} className="text-white/20" />
      <span className="text-xs text-white/80 px-2 py-1 rounded bg-brand-500/10 border border-brand-500/20 font-semibold">{current}</span>
    </div>
  )
}

function DriftHistoryRow({ entry }: { entry: DriftEntry }) {
  const date = new Date(entry.timestamp)
  const relative = formatRelative(date)

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white/60 truncate">{entry.query}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-white/25 flex items-center gap-1">
            <Clock size={10} /> {relative}
          </span>
          {entry.verdict_label && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40 uppercase tracking-wider">
              {entry.verdict_label}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-bold text-white/50">
          {entry.hermes_score >= 0 ? entry.hermes_score : '?'}
        </span>
        <span className="text-[9px] text-white/20">{Math.round(entry.similarity * 100)}% match</span>
      </div>
    </div>
  )
}

function formatRelative(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

export default function VerdictDrift({ sessionId }: VerdictDriftProps) {
  const [drift, setDrift] = useState<DriftAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetch<DriftAnalysis>(`/api/sessions/${sessionId}/drift`)
      .then((data) => { if (!cancelled) setDrift(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sessionId])

  if (loading || !drift || !drift.has_drift) return null

  const { similar_sessions, score_delta, score_direction, current_score, past_score,
    label_changed, current_label, past_label, current_claims, past_claims } = drift

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 0.5 }}
    >
      <GlassCard className="p-0 overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative px-5 py-4 border-b border-white/[0.06]">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.06] via-transparent to-brand-500/[0.06]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <GitCompare size={16} className="text-violet-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">Verdict Drift</h3>
                <p className="text-[10px] text-white/30">
                  {similar_sessions.length} similar {similar_sessions.length === 1 ? 'session' : 'sessions'} found
                </p>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Score comparison — always visible */}
        <div className="px-5 py-4 flex flex-wrap items-center gap-6">
          {score_delta != null && (
            <ScoreDelta current={current_score} past={past_score} direction={score_direction} />
          )}
          {label_changed && past_label && current_label && (
            <LabelChange past={past_label} current={current_label} />
          )}
          {(current_claims > 0 || past_claims > 0) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/25 uppercase tracking-wider">Claims</span>
              <span className="text-xs text-white/40">{past_claims}</span>
              <ArrowRight size={10} className="text-white/15" />
              <span className="text-xs text-white/70 font-medium">{current_claims}</span>
            </div>
          )}
        </div>

        {/* Narrative — what changed and why */}
        <div className="px-5 pb-4">
          <p className="text-[11px] text-white/40 leading-relaxed">
            {score_direction === 'improved' && score_delta != null
              ? `Hermes score improved by ${score_delta} points since a similar question was last analyzed.${label_changed ? ` Verdict shifted from ${past_label} to ${current_label}.` : ''} This suggests the adversarial debate and DPO training loop is refining analysis quality.`
              : score_direction === 'declined' && score_delta != null
                ? `Hermes score decreased by ${Math.abs(score_delta)} points compared to a similar past analysis.${label_changed ? ` Verdict shifted from ${past_label} to ${current_label}.` : ''} This may reflect new evidence or stricter evaluation criteria.`
                : `Hermes reached a similar score on this topic as before.${label_changed ? ` However, the verdict label changed from ${past_label} to ${current_label}, indicating a shift in assessment.` : ' The analysis remains consistent.'}`
            }
          </p>
        </div>

        {/* Expanded: similar session history */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-white/[0.06]"
            >
              <div className="px-3 py-3 space-y-1">
                <p className="text-[9px] uppercase tracking-wider text-white/20 font-semibold px-3 mb-2">
                  Similar Past Analyses
                </p>
                {similar_sessions.map((entry) => (
                  <DriftHistoryRow key={entry.session_id} entry={entry} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  )
}
