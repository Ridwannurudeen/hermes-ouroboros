import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import CommandInput from '../ui/CommandInput'
import ExampleChips from '../ui/ExampleChips'
import { Play, Loader2, Clock, Shield, Search, BarChart3, Columns } from 'lucide-react'
import type { AnalysisMode } from '../../api/types'

interface QueryPanelProps {
  examples: string[]
  isStreaming: boolean
  elapsed: number
  onSubmit: (query: string, mode: string, analysisMode: AnalysisMode, compare?: boolean) => void
  initialQuery?: string
}

const MODE_CARDS: { key: AnalysisMode; label: string; tagline: string; icon: typeof Shield; color: string; bg: string; border: string; text: string }[] = [
  { key: 'red_team', label: 'Red Team', tagline: 'Stress-test any idea, plan, or strategy', icon: Shield, color: 'rose', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  { key: 'verify', label: 'Verify', tagline: 'Fact-check any claim or statement', icon: Search, color: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  { key: 'research', label: 'Research', tagline: 'Deep-dive analysis with bull & bear cases', icon: BarChart3, color: 'violet', bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
]

const MODE_EXAMPLES: Record<AnalysisMode, string[]> = {
  default: [],
  red_team: [
    'My startup idea: AI-powered personal finance app for Gen Z',
    'Our go-to-market strategy relies on viral TikTok growth',
    'We plan to raise $5M seed round at $25M valuation',
  ],
  verify: [
    'GPT-4 can pass the bar exam with a top 10% score',
    'The average American has $65,000 in student loan debt',
    'Remote workers are 13% more productive than office workers',
  ],
  research: [
    'Is Solana a good long-term investment compared to Ethereum?',
    'What are the real risks of AI replacing software engineers?',
    'Analyze the bull and bear case for nuclear energy stocks',
  ],
}

export default function QueryPanel({ examples, isStreaming, elapsed, onSubmit, initialQuery }: QueryPanelProps) {
  const [query, setQuery] = useState('')
  const [mode] = useState('default')
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('red_team')
  const [compareMode, setCompareMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery)
  }, [initialQuery])

  const handleSubmit = () => {
    if (!query.trim() || isStreaming) return
    onSubmit(query.trim(), mode, analysisMode, compareMode)
  }

  const activeExamples = analysisMode !== 'default'
    ? MODE_EXAMPLES[analysisMode]
    : examples

  const activeModeInfo = MODE_CARDS.find((m) => m.key === analysisMode)
  const submitLabel = activeModeInfo
    ? `Run ${activeModeInfo.label}`
    : 'Run Council'

  return (
    <div className="space-y-4">
      {/* Mode selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODE_CARDS.map((m) => {
          const Icon = m.icon
          const isActive = analysisMode === m.key
          return (
            <motion.button
              key={m.key}
              onClick={() => setAnalysisMode(m.key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-3 rounded-xl border text-left transition-all duration-300 ${
                isActive
                  ? `${m.border} ${m.bg}`
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={isActive ? m.text : 'text-white/30'} />
                <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? m.text : 'text-white/40'}`}>
                  {m.label}
                </span>
              </div>
              <p className="text-[10px] text-white/30 leading-tight">{m.tagline}</p>
              {isActive && (
                <motion.div
                  layoutId="mode-indicator"
                  className={`absolute inset-0 rounded-xl border ${m.border} pointer-events-none`}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      <CommandInput
        ref={textareaRef}
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        disabled={isStreaming}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <div className="flex items-center gap-1.5 text-xs text-white/25 font-mono">
              <Clock size={11} />
              <span>{elapsed}s</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            disabled={isStreaming}
            title={compareMode ? 'Compare mode ON — Solo vs Council side-by-side' : 'Enable head-to-head compare'}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
              compareMode
                ? 'border-brand-500/40 bg-brand-500/10 text-brand-400'
                : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50'
            } disabled:opacity-30`}
          >
            <Columns size={13} />
            <span className="hidden sm:inline">Compare</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={!query.trim() || isStreaming}
            className="btn-glow flex items-center gap-2.5 px-6 py-2.5 text-white rounded-xl text-sm font-semibold tracking-wide
              disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isStreaming ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Deliberating...
              </>
            ) : (
              <>
                <Play size={15} /> {submitLabel}
              </>
            )}
          </button>
        </div>
      </div>

      <ExampleChips examples={activeExamples} onSelect={setQuery} />
    </div>
  )
}
