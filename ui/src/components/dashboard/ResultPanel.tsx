import { motion } from 'framer-motion'
import { Scale, AlertTriangle, Users, BookOpen, Zap, Brain, Eye, Skull, Target, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import Pill from '../ui/Pill'
import ProgressBar from '../ui/ProgressBar'
import type { SessionResult, AgentRole, AnalysisMode } from '../../api/types'
import { MODE_AGENT_LABELS } from '../../api/types'

interface ResultPanelProps {
  result: SessionResult
}

const COUNCIL_ROLES: AgentRole[] = ['advocate', 'skeptic', 'oracle', 'contrarian']

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400'
  const bgColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
  const ringColor = score >= 70 ? 'stroke-emerald-500' : score >= 40 ? 'stroke-amber-500' : 'stroke-rose-500'

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.max(0, score) / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r={radius} fill="none"
            className={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={`text-2xl font-bold ${color}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score >= 0 ? score : '?'}
          </motion.span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-white/40 mt-1 font-semibold">{label}</span>
      <ProgressBar value={Math.max(0, score)} color={bgColor} className="w-20 mt-1" />
    </div>
  )
}

function VerdictSection({ icon, title, content, color = 'text-white/80' }: {
  icon: React.ReactNode; title: string; content: string; color?: string
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">{title}</h4>
      </div>
      <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{content}</p>
    </GlassCard>
  )
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const vs = result.verdict_sections || {}
  const mode: AnalysisMode = (result.analysis_mode as AnalysisMode) || 'default'
  const labels = MODE_AGENT_LABELS[mode] || MODE_AGENT_LABELS.default
  const hermesScore = result.hermes_score ?? vs.hermes_score ?? result.confidence_score
  const confidenceScore = vs.confidence ?? result.confidence_score
  const verdictLabel = vs.verdict_label || ''

  const verdictColor =
    verdictLabel.includes('STRONG') || verdictLabel.includes('TRUE') || verdictLabel.includes('BULLISH')
      ? 'text-emerald-400'
      : verdictLabel.includes('FATAL') || verdictLabel.includes('FALSE') || verdictLabel.includes('BEARISH')
        ? 'text-rose-400'
        : 'text-amber-400'

  return (
    <div className="space-y-4">
      {/* Hero: Scores + Verdict Label */}
      <GlassCard glow className="p-6">
        <div className="flex items-start gap-6">
          <ScoreGauge score={hermesScore} label="HERMES Score" />
          {confidenceScore !== hermesScore && confidenceScore >= 0 && (
            <ScoreGauge score={confidenceScore} label="Confidence" />
          )}
          <div className="flex-1 min-w-0">
            {verdictLabel && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-lg font-black uppercase tracking-wider mb-2 ${verdictColor}`}
              >
                {verdictLabel}
              </motion.p>
            )}
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap line-clamp-6">
              {result.arbiter_verdict || result.verdict || ''}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Structured verdict sections */}
      {(vs.fatal_flaws || vs.key_strengths || vs.key_evidence_for || vs.key_evidence_against ||
        vs.bull_case_summary || vs.bear_case_summary) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vs.key_strengths && (
            <VerdictSection
              icon={<TrendingUp size={14} className="text-emerald-400" />}
              title="Key Strengths"
              content={vs.key_strengths}
            />
          )}
          {vs.fatal_flaws && (
            <VerdictSection
              icon={<Skull size={14} className="text-rose-400" />}
              title="Fatal Flaws"
              content={vs.fatal_flaws}
            />
          )}
          {vs.key_evidence_for && (
            <VerdictSection
              icon={<TrendingUp size={14} className="text-emerald-400" />}
              title="Evidence For"
              content={vs.key_evidence_for}
            />
          )}
          {vs.key_evidence_against && (
            <VerdictSection
              icon={<TrendingDown size={14} className="text-rose-400" />}
              title="Evidence Against"
              content={vs.key_evidence_against}
            />
          )}
          {vs.bull_case_summary && (
            <VerdictSection
              icon={<TrendingUp size={14} className="text-emerald-400" />}
              title="Bull Case"
              content={vs.bull_case_summary}
            />
          )}
          {vs.bear_case_summary && (
            <VerdictSection
              icon={<TrendingDown size={14} className="text-rose-400" />}
              title="Bear Case"
              content={vs.bear_case_summary}
            />
          )}
        </div>
      )}

      {/* Thinking Traps + Blind Spots + Premortem */}
      {(vs.thinking_traps || vs.blind_spots || vs.premortem) && (
        <div className="space-y-3">
          {vs.thinking_traps && (
            <VerdictSection
              icon={<Brain size={14} className="text-violet-400" />}
              title="Thinking Traps"
              content={vs.thinking_traps}
            />
          )}
          {vs.blind_spots && (
            <VerdictSection
              icon={<Eye size={14} className="text-amber-400" />}
              title="Blind Spots"
              content={vs.blind_spots}
            />
          )}
          {vs.premortem && (
            <VerdictSection
              icon={<Skull size={14} className="text-rose-400" />}
              title="Premortem"
              content={vs.premortem}
            />
          )}
        </div>
      )}

      {/* Fix or Die / Action Items */}
      {(vs.fix_or_die || vs.action_items) && (
        <GlassCard glow className="p-5 border-brand-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-brand-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {vs.fix_or_die ? 'Fix or Die' : 'Bottom Line'}
            </h3>
          </div>
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
            {vs.fix_or_die || vs.action_items}
          </p>
        </GlassCard>
      )}

      {/* Missing context / Source credibility / Key uncertainties */}
      {(vs.missing_context || vs.source_credibility || vs.key_uncertainties) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vs.missing_context && (
            <VerdictSection
              icon={<HelpCircle size={14} className="text-amber-400" />}
              title="Missing Context"
              content={vs.missing_context}
            />
          )}
          {vs.source_credibility && (
            <VerdictSection
              icon={<Scale size={14} className="text-violet-400" />}
              title="Source Credibility"
              content={vs.source_credibility}
            />
          )}
          {vs.key_uncertainties && (
            <VerdictSection
              icon={<HelpCircle size={14} className="text-amber-400" />}
              title="Key Uncertainties"
              content={vs.key_uncertainties}
            />
          )}
        </div>
      )}

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

      {/* Agent Responses — Round 1 */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">
          {result.round2_responses ? 'Round 1 — Initial Analysis' : 'Agent Responses'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COUNCIL_ROLES.map((role, i) => {
            const response = result.agent_responses[role]
            if (!response) return null
            return (
              <motion.div
                key={role}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard hover className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill variant={role === 'arbiter' ? 'success' : 'info'}>{labels[role]}</Pill>
                    {result.agent_timings[role] && (
                      <span className="text-[11px] text-white/30">{result.agent_timings[role].duration_seconds.toFixed(1)}s</span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap line-clamp-[12]">{response}</p>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Agent Responses — Round 2 */}
      {result.round2_responses && Object.keys(result.round2_responses).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Round 2 — Rebuttals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COUNCIL_ROLES.map((role, i) => {
              const response = result.round2_responses![role]
              if (!response) return null
              return (
                <motion.div
                  key={`r2-${role}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <GlassCard hover className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill variant="warning">{labels[role]} (R2)</Pill>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap line-clamp-[12]">{response}</p>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

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
