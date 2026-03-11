import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SSEAgentEvent, AgentRole } from '../../api/types'
import { AGENT_META } from '../../api/types'

const COUNCIL_ROLES: AgentRole[] = ['advocate', 'skeptic', 'oracle', 'contrarian']

const ROLE_COLORS: Record<string, string> = {
  advocate: 'border-indigo-500/30',
  skeptic: 'border-amber-500/30',
  oracle: 'border-violet-500/30',
  contrarian: 'border-rose-500/30',
  arbiter: 'border-emerald-500/30',
}

const ROLE_BG: Record<string, string> = {
  advocate: 'bg-indigo-500/10',
  skeptic: 'bg-amber-500/10',
  oracle: 'bg-violet-500/10',
  contrarian: 'bg-rose-500/10',
  arbiter: 'bg-emerald-500/10',
}

const ROLE_TEXT: Record<string, string> = {
  advocate: 'text-indigo-400',
  skeptic: 'text-amber-400',
  oracle: 'text-violet-400',
  contrarian: 'text-rose-400',
  arbiter: 'text-emerald-400',
}

interface AgentStreamPanelProps {
  streamingText: Record<string, string>
  completedAgents: Record<string, SSEAgentEvent>
  isStreaming: boolean
}

function AutoScrollBox({ text, role, isDone, duration }: { text: string; role: string; isDone: boolean; duration?: number }) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight
    }
  }, [text])

  const meta = AGENT_META[role as AgentRole]
  const label = meta?.label || role

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border ${ROLE_COLORS[role] || 'border-white/10'} bg-white/[0.02] overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${ROLE_TEXT[role] || 'text-white/50'} ${ROLE_BG[role] || ''} px-2 py-0.5 rounded-full`}>
          {label}
        </span>
        {isDone && duration != null && (
          <span className="text-[10px] text-white/30 flex items-center gap-1">
            <span className="text-emerald-400">&#10003;</span>
            {duration.toFixed(1)}s
          </span>
        )}
      </div>
      {/* Body */}
      <div
        ref={boxRef}
        className="h-40 overflow-y-auto p-3 font-mono text-xs text-white/50 leading-relaxed whitespace-pre-wrap break-words"
      >
        {text || <span className="text-white/20 italic">waiting...</span>}
        {!isDone && text && (
          <span className="inline-block w-1.5 h-3.5 bg-white/40 ml-0.5 align-middle animate-pulse" />
        )}
      </div>
    </motion.div>
  )
}

export default function AgentStreamPanel({ streamingText, completedAgents, isStreaming }: AgentStreamPanelProps) {
  const hasAnyText = Object.keys(streamingText).length > 0
  if (!hasAnyText && !isStreaming) return null

  const showArbiter = !!streamingText['arbiter']
  const allCouncilDone = COUNCIL_ROLES.every((r) => !!completedAgents[r])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        {/* 2x2 grid for council agents */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COUNCIL_ROLES.map((role) => (
            <AutoScrollBox
              key={role}
              role={role}
              text={streamingText[role] || ''}
              isDone={!!completedAgents[role]}
              duration={completedAgents[role]?.duration_seconds}
            />
          ))}
        </div>

        {/* Arbiter — full-width below */}
        {showArbiter && allCouncilDone && (
          <AutoScrollBox
            role="arbiter"
            text={streamingText['arbiter'] || ''}
            isDone={!isStreaming}
            duration={undefined}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
