import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Search, BarChart3, ArrowRight, Loader2 } from 'lucide-react'
import { ScoreGauge } from '../dashboard/ResultPanel'
import type { AnalysisMode, SessionResult, SSEEvent } from '../../api/types'

const MODES: { key: AnalysisMode; icon: typeof Shield; label: string; color: string; bg: string }[] = [
  { key: 'red_team', icon: Shield, label: 'Red Team', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { key: 'verify', icon: Search, label: 'Verify', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'research', icon: BarChart3, label: 'Research', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
]

const EXAMPLES: Record<AnalysisMode, string[]> = {
  default: [],
  red_team: [
    'My startup idea: AI-powered personal finance app for Gen Z',
    'Our go-to-market strategy relies on viral TikTok growth',
  ],
  verify: [
    'GPT-4 can pass the bar exam with a top 10% score',
    'Remote workers are 13% more productive than office workers',
  ],
  research: [
    'Is Solana a good long-term investment compared to Ethereum?',
    'What are the real risks of AI replacing software engineers?',
  ],
}

type DemoState = 'idle' | 'streaming' | 'result' | 'error' | 'limited'

export default function LandingDemo() {
  const [mode, setMode] = useState<AnalysisMode>('red_team')
  const [query, setQuery] = useState('')
  const [demoState, setDemoState] = useState<DemoState>('idle')
  const [arbiterText, setArbiterText] = useState('')
  const [result, setResult] = useState<SessionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)

  const handleSubmit = async (directQuery?: string) => {
    const q = (directQuery ?? query).trim()
    if (!q || demoState === 'streaming') return
    setDemoState('streaming')
    setArbiterText('')
    setResult(null)

    try {
      const res = await fetch('/api/query/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, mode: 'default', analysis_mode: mode }),
      })

      if (res.status === 429) {
        setDemoState('limited')
        return
      }
      if (!res.ok) {
        throw new Error(await res.text())
      }

      const reader = res.body!.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let buffer = ''
      let final: SessionResult | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop()!
        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue
          let event: SSEEvent
          try { event = JSON.parse(chunk.slice(6)) } catch { continue }
          if (event.type === 'agent_token' && event.role === 'arbiter') {
            setArbiterText((t) => t + event.token)
          } else if (event.type === 'final') {
            final = event.result
          } else if (event.type === 'error') {
            throw new Error(event.message)
          }
        }
      }

      if (final) {
        setResult(final)
        setDemoState('result')
      } else {
        throw new Error('No result received')
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Something went wrong')
      setDemoState('error')
    }
  }

  const vs = result?.verdict_sections
  const score = result?.hermes_score ?? vs?.hermes_score ?? result?.confidence_score ?? 0
  const verdictLabel = vs?.verdict_label || ''
  const verdictColor =
    verdictLabel.includes('STRONG') || verdictLabel.includes('TRUE') || verdictLabel.includes('BULLISH')
      ? 'text-emerald-400'
      : verdictLabel.includes('FATAL') || verdictLabel.includes('FALSE') || verdictLabel.includes('BEARISH')
        ? 'text-rose-400'
        : 'text-amber-400'

  return (
    <div className="space-y-5">
      {/* Mode pills */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        {MODES.map((m) => {
          const Icon = m.icon
          const active = mode === m.key
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all ${
                active ? `${m.bg} ${m.color}` : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={14} />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Query input */}
      <div className="relative group">
        <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
        <div className="relative flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 group-focus-within:border-cyan-500/25">
          <Search size={16} className="text-white/20 group-focus-within:text-cyan-400/50 transition-colors flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Is Bitcoin a good long-term investment?"
            disabled={demoState === 'streaming'}
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!query.trim() || demoState === 'streaming'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {demoState === 'streaming' ? (
              <><Loader2 size={14} className="animate-spin" /> Deliberating...</>
            ) : (
              <>Run Council <ArrowRight size={12} /></>
            )}
          </button>
        </div>
      </div>

      {/* Example chips */}
      {EXAMPLES[mode]?.length > 0 && demoState !== 'streaming' && (
        <div className="flex items-center gap-2 justify-center flex-wrap">
          {EXAMPLES[mode].map((ex) => (
            <button
              key={ex}
              onClick={() => { setQuery(ex); handleSubmit(ex) }}
              className="px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[11px] text-white/40 hover:text-white/60 hover:bg-white/[0.05] hover:border-white/10 transition-all truncate max-w-[280px]"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* States */}
      <AnimatePresence mode="wait">
        {demoState === 'streaming' && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-xs font-semibold text-cyan-300/60 uppercase tracking-wider">Council Deliberating</span>
            </div>
            {arbiterText ? (
              <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">
                {arbiterText}<span className="inline-block w-1.5 h-3.5 bg-cyan-400/60 ml-0.5 animate-pulse" />
              </p>
            ) : (
              <p className="text-xs text-white/30 italic">Agents analyzing your query...</p>
            )}
          </motion.div>
        )}

        {demoState === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
          >
            <div className="flex items-start gap-5">
              <ScoreGauge score={score} label="HERMES Score" />
              <div className="flex-1 min-w-0">
                {verdictLabel && (
                  <motion.p
                    initial={{ opacity: 0, scale: 1.15, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className={`text-base font-black uppercase tracking-wider mb-1.5 ${verdictColor}`}
                  >
                    {verdictLabel}
                  </motion.p>
                )}
                <p className="text-xs text-white/50 leading-relaxed line-clamp-3">
                  {result.arbiter_verdict || result.verdict || ''}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <a
                href="/app"
                className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Open Full Verdict <ArrowRight size={12} />
              </a>
            </div>
          </motion.div>
        )}

        {demoState === 'limited' && (
          <motion.div
            key="limited"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center"
          >
            <p className="text-sm text-amber-300/80 mb-2">5 free queries used</p>
            <a href="/app" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
              Launch HERMES for unlimited access <ArrowRight size={12} className="inline" />
            </a>
          </motion.div>
        )}

        {demoState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-center"
          >
            <p className="text-xs text-rose-300/60">{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
