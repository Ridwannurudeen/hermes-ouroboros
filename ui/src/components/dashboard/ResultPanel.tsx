import { motion } from 'framer-motion'
import { Scale, AlertTriangle, Users, BookOpen, Zap } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import Pill from '../ui/Pill'
import ProgressBar from '../ui/ProgressBar'
import type { SessionResult } from '../../api/types'
import { AGENT_META, AGENT_ROLES } from '../../api/types'

interface ResultPanelProps {
  result: SessionResult
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const confidenceColor = result.confidence_score >= 70 ? 'bg-emerald-500' : result.confidence_score >= 40 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <GlassCard glow className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Verdict</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{result.confidence_score}<span className="text-sm text-white/40">/100</span></p>
            <ProgressBar value={result.confidence_score} color={confidenceColor} className="w-24 mt-1" />
          </div>
        </div>
        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{result.verdict}</p>
      </GlassCard>

      {/* Conflict */}
      {result.conflict_detected && (
        <GlassCard className="p-5 border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400">Conflict Detected</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">{result.conflict_summary}</p>
        </GlassCard>
      )}

      {/* Dissent */}
      {result.dissent_summary && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-rose-400" />
            <h3 className="text-sm font-semibold text-white/80">Dissent</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">{result.dissent_summary}</p>
        </GlassCard>
      )}

      {/* Agent Responses */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Agent Responses</h3>
        {AGENT_ROLES.map((role, i) => {
          const response = result.agent_responses[role]
          if (!response) return null
          const meta = AGENT_META[role]
          return (
            <motion.div
              key={role}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard hover className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pill variant={role === 'arbiter' ? 'success' : 'info'}>{meta.label}</Pill>
                  {result.agent_timings[role] && (
                    <span className="text-[11px] text-white/30">{result.agent_timings[role].duration_seconds.toFixed(1)}s</span>
                  )}
                </div>
                <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{response}</p>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* Evidence */}
      {result.additional_research && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-white/80">Research Evidence</h3>
          </div>
          <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{result.additional_research}</p>
        </GlassCard>
      )}

      {/* DPO */}
      {result.dpo_pairs_created !== undefined && result.dpo_pairs_created > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Zap size={14} className="text-brand-400" />
          <p className="text-xs text-white/40">{result.dpo_pairs_created} DPO training pairs created from this session</p>
        </div>
      )}
    </div>
  )
}
