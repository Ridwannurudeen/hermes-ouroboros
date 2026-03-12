import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Scale, AlertTriangle, BookOpen, Zap, Brain, Eye, Skull, Target,
  TrendingUp, TrendingDown, HelpCircle, Copy, Check, Share2, ExternalLink,
  Columns, Globe, Clock, ArrowRight, RotateCcw,
} from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import Pill from '../ui/Pill'
import ProgressBar from '../ui/ProgressBar'
import ClaimBreakdown from './ClaimBreakdown'
import FeedbackPanel from './FeedbackPanel'
import MemoExport from './MemoExport'
import VerdictDrift from './VerdictDrift'
import { apiPost } from '../../api/client'
import type { SessionResult, AgentRole, AnalysisMode, EvidenceItem, LoopStatusData } from '../../api/types'
import { MODE_AGENT_LABELS } from '../../api/types'

interface ResultPanelProps {
  result: SessionResult
  soloResult?: { response: string; elapsed_seconds: number } | null
  soloLoading?: boolean
  loopStatus?: LoopStatusData | null
  onFollowUp?: (query: string) => void
}

const COUNCIL_ROLES: AgentRole[] = ['advocate', 'skeptic', 'oracle', 'contrarian']

export function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400'
  const bgColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
  const ringColor = score >= 70 ? 'stroke-emerald-500' : score >= 40 ? 'stroke-amber-500' : 'stroke-rose-500'

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.max(0, score) / 100) * circumference

  // Count-up animation for the score number
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => Math.round(v))
  const [displayNum, setDisplayNum] = useState(0)

  useEffect(() => {
    const target = score >= 0 ? score : 0
    const controls = animate(motionVal, target, { duration: 1.5, delay: 0.3, ease: 'easeOut' })
    const unsub = rounded.on('change', (v) => setDisplayNum(v))
    return () => { controls.stop(); unsub() }
  }, [score, motionVal, rounded])

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
            transition={{ delay: 0.3 }}
          >
            {score >= 0 ? displayNum : '?'}
          </motion.span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-white/40 mt-1 font-semibold">{label}</span>
      <ProgressBar value={Math.max(0, score)} color={bgColor} className="w-20 mt-1" />
    </div>
  )
}

function VerdictSection({ icon, title, content }: {
  icon: React.ReactNode; title: string; content: string
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">{title}</h4>
      </div>
      <p className="text-[13px] text-white/60 leading-relaxed whitespace-pre-wrap">{content}</p>
    </GlassCard>
  )
}

/* ---------- Source Card (Feature 1) ---------- */
function SourceCard({ item, label }: { item: EvidenceItem; label: string }) {
  let domain = ''
  try { domain = new URL(item.url).hostname } catch { domain = item.url }
  const labelColor = label === 'Supporting' ? 'text-emerald-400' : label === 'Counter' ? 'text-rose-400' : 'text-violet-400'

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
          alt="" width={14} height={14} className="rounded-sm"
        />
        <span className="text-xs text-white/70 font-medium truncate flex-1 group-hover:text-white/90">
          {item.title || domain}
        </span>
        <ExternalLink size={10} className="text-white/20 flex-shrink-0" />
      </div>
      <p className="text-[10px] text-white/35 line-clamp-2 leading-relaxed">{item.snippet}</p>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${labelColor}`}>{label}</span>
        {item.trust_tier && item.trust_tier !== 'Unknown' && (
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
            item.trust_tier === 'Academic' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' :
            item.trust_tier === 'Government' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
            item.trust_tier === 'Major News' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
            'bg-amber-500/10 text-amber-300 border-amber-500/20'
          }`}>
            {item.trust_tier}
          </span>
        )}
        {item.recency && item.recency !== 'Unknown' && (
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
            item.recency === 'Current' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
            item.recency === 'Recent' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
            'bg-white/[0.05] text-white/30 border-white/[0.1]'
          }`}>
            {item.recency}
          </span>
        )}
        {item.corroboration !== undefined && item.corroboration > 0 && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            +{item.corroboration} corr.
          </span>
        )}
        {item.trust_score !== undefined && (
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
            item.trust_score >= 60 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
            item.trust_score >= 35 ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
            'bg-rose-500/10 text-rose-300 border-rose-500/20'
          }`}>
            Trust: {item.trust_score}
          </span>
        )}
      </div>
      {item.trust_explanation && (
        <p className="text-[9px] text-white/20 mt-1 leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">
          {item.trust_explanation}
        </p>
      )}
    </a>
  )
}

function WebSourcesSection({ result }: { result: SessionResult }) {
  const we = result.web_evidence
  if (!we) return null

  const all: { item: EvidenceItem; label: string }[] = []
  const seen = new Set<string>()
  const addItems = (items: EvidenceItem[] | undefined, label: string) => {
    if (!items) return
    for (const item of items) {
      if (seen.has(item.url)) continue
      seen.add(item.url)
      all.push({ item, label })
    }
  }
  addItems(we.general, 'Supporting')
  addItems(we.counter, 'Counter')
  addItems(we.statistical, 'Data')

  if (all.length === 0) return null

  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? all : all.slice(0, 6)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Globe size={14} className="text-brand-400" />
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Web Sources</h3>
        <span className="text-[10px] text-white/20">{all.length} sources</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map(({ item, label }, i) => (
          <SourceCard key={item.url + i} item={item} label={label} />
        ))}
      </div>
      {all.length > 6 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[10px] text-brand-400 hover:text-brand-300 font-medium px-1"
        >
          Show all {all.length} sources
        </button>
      )}
    </div>
  )
}

/* ---------- Copy Verdict (Feature 2) ---------- */
function formatVerdictText(result: SessionResult): string {
  const vs = result.verdict_sections || {}
  const lines: string[] = []
  const label = vs.verdict_label || 'VERDICT'
  const score = result.hermes_score ?? vs.hermes_score ?? result.confidence_score
  const conf = vs.confidence ?? result.confidence_score

  lines.push(`HERMES VERDICT: ${label} — Score: ${score}/100`)
  lines.push(`Confidence: ${conf}%`)
  lines.push('')

  if (vs.key_strengths) lines.push(`KEY STRENGTHS:\n${vs.key_strengths}\n`)
  if (vs.fatal_flaws) lines.push(`FATAL FLAWS:\n${vs.fatal_flaws}\n`)
  if (vs.key_evidence_for) lines.push(`EVIDENCE FOR:\n${vs.key_evidence_for}\n`)
  if (vs.key_evidence_against) lines.push(`EVIDENCE AGAINST:\n${vs.key_evidence_against}\n`)
  if (vs.fix_or_die) lines.push(`FIX OR DIE:\n${vs.fix_or_die}\n`)
  if (vs.action_items) lines.push(`BOTTOM LINE:\n${vs.action_items}\n`)

  lines.push('Analyzed by HERMES Adversarial Intelligence Engine')
  lines.push('hermes-ouroboros.online')
  return lines.join('\n')
}

function CopyButton({ result }: { result: SessionResult }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatVerdictText(result))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy verdict"
      className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/60"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  )
}

/* ---------- Share on X Button ---------- */
function ShareOnXButton({ result }: { result: SessionResult }) {
  const vs = result.verdict_sections || {}
  const label = vs.verdict_label || 'VERDICT'
  const score = result.hermes_score ?? vs.hermes_score ?? result.confidence_score
  const q = (result.query || '').slice(0, 100)
  const text = `HERMES Verdict: ${label} (Score: ${score}/100)\n\n"${q}"\n\nAnalyzed by 5 adversarial AI agents\nhermes-ouroboros.online`

  return (
    <a
      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Share on X"
      className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/60"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>
  )
}

/* ---------- Share Button (Feature 6) ---------- */
function ShareButton({ result }: { result: SessionResult }) {
  const [shared, setShared] = useState(false)
  const handleShare = async () => {
    try {
      if (!result.share_id) {
        await apiPost<{ share_id: string }>(`/api/sessions/${result.session_id}/share`, {})
      }
      const url = `${window.location.origin}/verdict/${result.session_id}`
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch { /* silent */ }
  }
  return (
    <button
      onClick={handleShare}
      title="Share verdict link"
      className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/60"
    >
      {shared ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
    </button>
  )
}

/* ---------- DPO Loop Badge (Feature 5) ---------- */
function LoopStatusBadge({ loopStatus }: { loopStatus: LoopStatusData }) {
  return (
    <div className="relative rounded-xl p-[1px] overflow-hidden">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/30 via-violet-500/30 to-brand-500/30 animate-pulse" />
      <div className="relative rounded-xl bg-[#0a0a14] px-4 py-3 flex items-center gap-3">
        <Zap size={14} className="text-brand-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-0.5">
            HERMES Intelligence Loop
          </p>
          <p className="text-[10px] text-white/40">
            v{loopStatus.current_version || loopStatus.generation}
            {loopStatus.total_dpo_pairs != null && ` · ${loopStatus.total_dpo_pairs} DPO pairs`}
            {loopStatus.sessions_total != null && ` · ${loopStatus.sessions_total} sessions`}
            {loopStatus.trajectories_total != null && ` · ${loopStatus.trajectories_total} trajectories`}
          </p>
        </div>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
          loopStatus.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        }`}>
          {loopStatus.status}
        </span>
      </div>
    </div>
  )
}

/* ---------- Solo Comparison Card (Feature 4) ---------- */
function SoloCard({ response, elapsed, loading }: {
  response?: string; elapsed?: number; loading?: boolean
}) {
  return (
    <GlassCard className="p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-white/20" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Solo Hermes-3</h3>
        {elapsed != null && (
          <span className="text-[10px] text-white/25 flex items-center gap-1 ml-auto">
            <Clock size={10} /> {elapsed}s
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
        </div>
      ) : (
        <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{response || ''}</p>
      )}
    </GlassCard>
  )
}

/* ---------- Follow-Up Questions (Feature E) ---------- */
function generateFollowUps(query: string, mode: AnalysisMode): string[] {
  switch (mode) {
    case 'red_team':
      return ['What\'s the minimum viable version?', 'How would a competitor attack this?', 'What assumptions could be wrong?']
    case 'verify':
      return ['What are the primary sources?', 'Has this been debunked?', 'What\'s the historical context?']
    case 'research':
      return ['What are the counter-arguments?', 'What do experts disagree on?', 'How does this compare to alternatives?']
    default:
      return ['What risks am I not seeing?', 'What would change the verdict?', 'What should I do next?']
  }
}

function FollowUpQuestions({ query, mode, onFollowUp }: { query: string; mode: AnalysisMode; onFollowUp: (q: string) => void }) {
  const followUps = generateFollowUps(query, mode)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.0, duration: 0.5 }}
      className="space-y-3"
    >
      <p className="text-[10px] uppercase tracking-wider text-white/25 font-semibold px-1">Dig Deeper</p>
      <div className="flex flex-wrap gap-2">
        {followUps.map((q) => (
          <button
            key={q}
            onClick={() => onFollowUp(q)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-cyan-500/[0.06] hover:border-cyan-500/20 text-xs text-white/40 hover:text-white/70 transition-all"
          >
            {q}
            <ArrowRight size={12} className="opacity-40" />
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/* ---------- Main Component ---------- */
export default function ResultPanel({ result, soloResult, soloLoading, loopStatus, onFollowUp }: ResultPanelProps) {
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

  const showCompare = soloResult != null || soloLoading

  // Glow color hex for cinematic border pulse
  const glowHex = verdictLabel.includes('STRONG') || verdictLabel.includes('TRUE') || verdictLabel.includes('BULLISH')
    ? '#10b981'
    : verdictLabel.includes('FATAL') || verdictLabel.includes('FALSE') || verdictLabel.includes('BEARISH')
      ? '#f43f5e'
      : '#f59e0b'

  const councilContent = (
    <div className="space-y-4">
      {/* Hero: Scores + Verdict Label — Cinematic Reveal */}
      <motion.div
        initial={{ boxShadow: 'none' }}
        animate={{
          boxShadow: [
            `0 0 0px ${glowHex}00`,
            `0 0 30px ${glowHex}40`,
            `0 0 10px ${glowHex}15`,
          ],
        }}
        transition={{ duration: 1.8, delay: 1.0, ease: 'easeOut' }}
        className="rounded-2xl"
      >
        <GlassCard glow className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="flex items-start gap-4 sm:gap-6">
              <ScoreGauge score={hermesScore} label="HERMES Score" />
              {confidenceScore !== hermesScore && confidenceScore >= 0 && (
                <ScoreGauge score={confidenceScore} label="Confidence" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {verdictLabel && (
                    <motion.p
                      initial={{ opacity: 0, scale: 1.2, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      transition={{ delay: 1.2, duration: 0.5, ease: 'easeOut' }}
                      className={`text-lg font-black uppercase tracking-wider mb-2 ${verdictColor}`}
                    >
                      {verdictLabel}
                    </motion.p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <CopyButton result={result} />
                  <ShareButton result={result} />
                  <ShareOnXButton result={result} />
                  <MemoExport sessionId={result.session_id} />
                </div>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap line-clamp-6"
              >
                {result.arbiter_verdict || result.verdict || ''}
              </motion.p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Web Sources */}
      <WebSourcesSection result={result} />

      {/* Claim Breakdown — atomic claim analysis */}
      {result.claim_breakdown && result.claim_breakdown.length > 0 && (
        <ClaimBreakdown claims={result.claim_breakdown} />
      )}

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

      {/* What Would Change This Verdict */}
      {vs.what_would_change && (
        <GlassCard className="p-5 border-violet-500/20">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw size={16} className="text-violet-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">What Would Change This Verdict</h3>
          </div>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{vs.what_would_change}</p>
        </GlassCard>
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

      {/* Feedback — rate this verdict (feeds DPO training) */}
      <FeedbackPanel sessionId={result.session_id} existing={result.feedback} />

      {/* Verdict Drift — how has Hermes answered this before? */}
      <VerdictDrift sessionId={result.session_id} />

      {/* DPO */}
      {result.dpo_pairs_created !== undefined && result.dpo_pairs_created > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Zap size={14} className="text-brand-400" />
          <p className="text-xs text-white/40">{result.dpo_pairs_created} DPO training pairs created from this session</p>
        </div>
      )}

      {/* DPO Loop Status Badge */}
      {loopStatus && <LoopStatusBadge loopStatus={loopStatus} />}

      {/* Follow-up Questions (Feature E) */}
      {onFollowUp && <FollowUpQuestions query={result.query} mode={mode} onFollowUp={onFollowUp} />}
    </div>
  )

  if (!showCompare) return councilContent

  /* ---------- Head-to-Head Compare Layout (Feature 4) ---------- */
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Columns size={14} className="text-brand-400" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand-400">Head-to-Head Comparison</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Solo */}
        <SoloCard
          response={soloResult?.response}
          elapsed={soloResult?.elapsed_seconds}
          loading={soloLoading}
        />
        {/* Right: Full Council */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400">5-Agent Council</h3>
          </div>
          {councilContent}
        </div>
      </div>
    </div>
  )
}
