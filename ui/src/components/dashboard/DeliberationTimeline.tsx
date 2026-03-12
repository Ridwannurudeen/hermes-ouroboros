import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { SSEAgentEvent } from '../../api/types'

const AGENT_DOTS: { role: string; color: string; bg: string }[] = [
  { role: 'advocate', color: 'bg-cyan-500', bg: 'bg-cyan-500/20' },
  { role: 'skeptic', color: 'bg-amber-500', bg: 'bg-amber-500/20' },
  { role: 'oracle', color: 'bg-violet-500', bg: 'bg-violet-500/20' },
  { role: 'contrarian', color: 'bg-rose-500', bg: 'bg-rose-500/20' },
]

interface Props {
  completedAgents: Record<string, SSEAgentEvent>
  isStreaming: boolean
  isFinal: boolean
  hasRound2: boolean
}

function Phase({ label, active, done, dots }: {
  label: string
  active: boolean
  done: boolean
  dots: { filled: boolean; color: string; bg: string; pulse: boolean }[]
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          done ? 'text-emerald-400' : active ? 'text-cyan-300' : 'text-white/25'
        }`}>
          {label}
        </span>
        {done && <Check size={10} className="text-emerald-400" />}
      </div>

      {/* Progress bar */}
      <div className="relative h-1 rounded-full bg-white/[0.06] overflow-hidden">
        {(done || active) && (
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${done ? 'bg-emerald-500/60' : 'bg-cyan-500/50'}`}
            initial={{ width: '0%' }}
            animate={{ width: done ? '100%' : '50%' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </div>

      {/* Agent dots */}
      <div className="flex items-center gap-1.5 mt-1.5">
        {dots.map((d, i) => (
          <div key={i} className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${d.filled ? d.color : d.bg} transition-colors duration-300`} />
            {d.pulse && (
              <div className={`absolute inset-0 rounded-full ${d.color} animate-ping opacity-40`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DeliberationTimeline({ completedAgents, isStreaming, isFinal, hasRound2 }: Props) {
  const completedKeys = Object.keys(completedAgents)
  const r1Agents = completedKeys.filter((k) => !k.startsWith('r2_') && k !== 'arbiter')
  const r2Agents = completedKeys.filter((k) => k.startsWith('r2_'))
  const arbiterDone = completedKeys.includes('arbiter') || isFinal

  // Phase states
  const r1Done = r1Agents.length >= 4
  const r1Active = !r1Done && isStreaming
  const r2Done = hasRound2 ? r2Agents.length >= 4 : r1Done
  const r2Active = hasRound2 && r1Done && !r2Done && isStreaming
  const verdictDone = isFinal
  const verdictActive = (hasRound2 ? r2Done : r1Done) && !verdictDone && isStreaming

  const r1Dots = AGENT_DOTS.map((d) => ({
    filled: r1Agents.includes(d.role),
    color: d.color,
    bg: d.bg,
    pulse: r1Active && !r1Agents.includes(d.role),
  }))

  const r2Dots = AGENT_DOTS.map((d) => ({
    filled: r2Agents.includes(`r2_${d.role}`),
    color: d.color,
    bg: d.bg,
    pulse: r2Active && !r2Agents.includes(`r2_${d.role}`),
  }))

  const verdictDots = [{
    filled: arbiterDone,
    color: 'bg-emerald-500',
    bg: 'bg-emerald-500/20',
    pulse: verdictActive,
  }]

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <Phase label="Round 1" active={r1Active} done={r1Done} dots={r1Dots} />
        {hasRound2 && (
          <Phase label="Rebuttals" active={r2Active} done={r2Done} dots={r2Dots} />
        )}
        <Phase label="Verdict" active={verdictActive} done={verdictDone} dots={verdictDots} />
      </div>
    </motion.div>
  )
}
