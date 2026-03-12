import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SCENARIOS = [
  { mode: 'Red Team', query: 'My startup relies on viral TikTok growth', label: 'CRITICAL FLAWS DETECTED', score: 34, color: 'rose', modeBg: 'bg-rose-500/10 text-rose-400' },
  { mode: 'Verify', query: 'Remote workers are 13% more productive', label: 'PARTIALLY TRUE', score: 62, color: 'amber', modeBg: 'bg-amber-500/10 text-amber-400' },
  { mode: 'Research', query: 'Is nuclear energy the future?', label: 'STRONG BULL CASE', score: 78, color: 'emerald', modeBg: 'bg-emerald-500/10 text-emerald-400' },
]

const CHAR_DELAY = 30
const CYCLE_MS = 8000

export default function HeroAutoDemo() {
  const [index, setIndex] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'score' | 'verdict' | 'hold' | 'fade'>('typing')
  const [countScore, setCountScore] = useState(0)

  const scenario = SCENARIOS[index]

  // Typing phase
  useEffect(() => {
    if (phase !== 'typing') return
    if (typedChars >= scenario.query.length) {
      const t = setTimeout(() => setPhase('score'), 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setTypedChars((c) => c + 1), CHAR_DELAY)
    return () => clearTimeout(t)
  }, [phase, typedChars, scenario.query.length])

  // Score count-up phase
  useEffect(() => {
    if (phase !== 'score') return
    if (countScore >= scenario.score) {
      const t = setTimeout(() => setPhase('verdict'), 300)
      return () => clearTimeout(t)
    }
    const step = Math.max(1, Math.floor(scenario.score / 30))
    const t = setTimeout(() => setCountScore((c) => Math.min(c + step, scenario.score)), 40)
    return () => clearTimeout(t)
  }, [phase, countScore, scenario.score])

  // Verdict -> hold -> fade -> next
  useEffect(() => {
    if (phase === 'verdict') {
      const t = setTimeout(() => setPhase('hold'), 500)
      return () => clearTimeout(t)
    }
    if (phase === 'hold') {
      const t = setTimeout(() => setPhase('fade'), 3000)
      return () => clearTimeout(t)
    }
    if (phase === 'fade') {
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % SCENARIOS.length)
        setTypedChars(0)
        setCountScore(0)
        setPhase('typing')
      }, 600)
      return () => clearTimeout(t)
    }
  }, [phase])

  const scoreColor = scenario.score >= 70 ? 'text-emerald-400' : scenario.score >= 40 ? 'text-amber-400' : 'text-rose-400'
  const ringColor = scenario.score >= 70 ? 'stroke-emerald-500' : scenario.score >= 40 ? 'stroke-amber-500' : 'stroke-rose-500'
  const circumference = 2 * Math.PI * 28
  const offset = circumference - (circumference * (phase === 'typing' ? 0 : countScore)) / 100

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'fade' ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 max-w-xl mx-auto"
      >
        {/* Mode badge */}
        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3 ${scenario.modeBg}`}>
          {scenario.mode}
        </span>

        {/* Query with typewriter */}
        <p className="text-sm text-white/70 font-mono mb-4 h-6">
          {scenario.query.slice(0, typedChars)}
          {phase === 'typing' && <span className="inline-block w-1.5 h-4 bg-indigo-400/60 ml-0.5 align-middle animate-pulse" />}
        </p>

        {/* Score + Verdict row */}
        {phase !== 'typing' && (
          <div className="flex items-center gap-4">
            {/* Score ring */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/[0.06]" />
                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="3" strokeLinecap="round"
                  className={ringColor} style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: 'stroke-dashoffset 0.3s ease' }} />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-lg font-black ${scoreColor}`}>
                {countScore}
              </span>
            </div>

            {/* Verdict label */}
            {(phase === 'verdict' || phase === 'hold' || phase === 'fade') && (
              <motion.p
                initial={{ opacity: 0, scale: 1.15, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.4 }}
                className={`text-sm font-black uppercase tracking-wider ${scoreColor}`}
              >
                {scenario.label}
              </motion.p>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
