import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ScoreGauge } from '../dashboard/ResultPanel'

const EXAMPLES = [
  {
    mode: 'Research',
    modeBg: 'bg-violet-500/10 text-violet-400',
    query: 'Is Bitcoin a store of value?',
    score: 65,
    verdictLabel: 'MODERATE BULL CASE',
    verdictColor: 'text-amber-400',
    summary: 'Bitcoin demonstrates store-of-value properties through scarcity mechanics and growing institutional adoption, but extreme volatility undermines the thesis for shorter time horizons.',
    strengths: 'Fixed 21M supply cap creates genuine digital scarcity. Institutional adoption via ETFs adds legitimacy. 15-year track record of recovery from every major drawdown.',
    flaws: 'Annualized volatility of 60-80% contradicts "store of value" definition. Regulatory risk remains material. Energy consumption creates political headwinds.',
  },
  {
    mode: 'Verify',
    modeBg: 'bg-amber-500/10 text-amber-400',
    query: 'GPT-4 passed the bar exam',
    score: 58,
    verdictLabel: 'PARTIALLY TRUE',
    verdictColor: 'text-amber-400',
    summary: 'GPT-4 scored in the ~90th percentile on the Uniform Bar Exam simulation, but the testing methodology differs significantly from actual exam conditions.',
    strengths: 'OpenAI\'s technical report confirms 90th percentile on simulated MBE, MEE, and MPT sections. Result independently replicated by third-party researchers.',
    flaws: 'Test used multiple-choice format only — no actual essay grading by bar examiners. Real bar exam includes character & fitness review. "Passing" threshold varies by jurisdiction.',
  },
  {
    mode: 'Red Team',
    modeBg: 'bg-rose-500/10 text-rose-400',
    query: 'AI SaaS with no moat',
    score: 31,
    verdictLabel: 'CRITICAL FLAWS',
    verdictColor: 'text-rose-400',
    summary: 'Without proprietary data, switching costs, or network effects, this AI SaaS faces commoditization as foundation model providers and incumbents replicate thin wrapper value.',
    strengths: 'First-mover advantage in niche vertical. Low initial CAC through organic content. Current margins healthy at 80%+ gross.',
    flaws: 'OpenAI/Anthropic API wrappers have near-zero switching costs. No proprietary training data creates zero defensibility. Incumbents can ship equivalent features in weeks, not months.',
  },
]

export default function VerdictGallery() {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {EXAMPLES.map((ex, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15, duration: 0.5 }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-left"
        >
          {/* Mode badge + query */}
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2 ${ex.modeBg}`}>
            {ex.mode}
          </span>
          <p className="text-sm text-white/70 font-medium mb-4">{ex.query}</p>

          {/* Score + verdict */}
          <div className="flex items-center gap-3 mb-3">
            <ScoreGauge score={ex.score} label="" />
            <p className={`text-xs font-black uppercase tracking-wider ${ex.verdictColor}`}>
              {ex.verdictLabel}
            </p>
          </div>

          {/* Summary */}
          <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2 mb-3">{ex.summary}</p>

          {/* Expandable details */}
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="flex items-center gap-1 text-[10px] text-indigo-400/60 hover:text-indigo-400 transition-colors font-semibold uppercase tracking-wider"
          >
            {expanded === i ? 'Hide Details' : 'Key Findings'}
            {expanded === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {expanded === i && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              <div>
                <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-wider mb-1">Key Strengths</p>
                <p className="text-[11px] text-white/35 leading-relaxed">{ex.strengths}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-400/60 uppercase tracking-wider mb-1">Fatal Flaws</p>
                <p className="text-[11px] text-white/35 leading-relaxed">{ex.flaws}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
