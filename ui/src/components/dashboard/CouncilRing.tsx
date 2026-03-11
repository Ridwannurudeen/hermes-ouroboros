import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SSEAgentEvent } from '../../api/types'

const CX = 140, CY = 140, R = 95, NODE_R = 18

const AGENTS = {
  advocate:   { angle: -90,  color: '#b34728', label: 'Advocate' },
  skeptic:    { angle: 0,    color: '#2d6a4f', label: 'Skeptic' },
  oracle:     { angle: 180,  color: '#5e548e', label: 'Oracle' },
  contrarian: { angle: 90,   color: '#bc6c25', label: 'Contrarian' },
} as const

const ARBITER_COLOR = '#3d5a80'
type Role = keyof typeof AGENTS

function pos(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}

const ROLES: Role[] = ['advocate', 'skeptic', 'oracle', 'contrarian']

// Build all 6 connection pairs
const PAIRS: [Role, Role][] = []
for (let i = 0; i < ROLES.length; i++) {
  for (let j = i + 1; j < ROLES.length; j++) {
    PAIRS.push([ROLES[i], ROLES[j]])
  }
}

interface CouncilRingProps {
  completedAgents: Record<string, SSEAgentEvent>
  isStreaming: boolean
  conflict?: boolean
  isFinal?: boolean
}

export default function CouncilRing({ completedAgents, isStreaming, conflict, isFinal }: CouncilRingProps) {
  const doneCount = Object.keys(completedAgents).length
  const allDone = doneCount === 4
  const synthesizing = allDone && isStreaming

  const statusText = useMemo(() => {
    if (isFinal) return conflict ? 'Conflict detected — verdict delivered' : 'Council aligned — verdict delivered'
    if (synthesizing) return 'Arbiter synthesizing...'
    if (doneCount > 0 && isStreaming) return `${doneCount}/4 agents complete — council deliberating...`
    if (isStreaming) return 'Council deliberating...'
    return ''
  }, [isFinal, conflict, synthesizing, doneCount, isStreaming])

  return (
    <div className="flex flex-col items-center py-4">
      <svg viewBox="0 0 280 280" className="w-[260px] h-[260px] sm:w-[280px] sm:h-[280px]">
        {/* Decorative outer ring */}
        <circle
          cx={CX} cy={CY} r={R + 22}
          fill="none" stroke="currentColor" strokeWidth={1}
          strokeDasharray="6 8" opacity={0.06}
          className="text-white"
        >
          <animateTransform
            attributeName="transform" type="rotate"
            from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`}
            dur="30s" repeatCount="indefinite"
          />
        </circle>

        {/* Connection lines between agents */}
        {PAIRS.map(([a, b]) => {
          const pa = pos(AGENTS[a].angle)
          const pb = pos(AGENTS[b].angle)
          const bothDone = !!completedAgents[a] && !!completedAgents[b]
          const lineColor = isFinal
            ? (conflict ? '#d4930a' : '#2e7d32')
            : (bothDone ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)')
          return (
            <line
              key={`${a}-${b}`}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={lineColor} strokeWidth={1.5}
              opacity={bothDone || isFinal ? 0.7 : 0.3}
              style={{ transition: 'stroke 0.5s, opacity 0.5s' }}
            />
          )
        })}

        {/* Agent nodes */}
        {ROLES.map(role => {
          const cfg = AGENTS[role]
          const p = pos(cfg.angle)
          const done = !!completedAgents[role]
          const working = isStreaming && !done

          return (
            <g key={role}>
              {/* Spinner ring while working */}
              {working && (
                <circle
                  cx={p.x} cy={p.y} r={NODE_R + 6}
                  fill="none" stroke={cfg.color} strokeWidth={2}
                  strokeDasharray="8 6" opacity={0.4}
                >
                  <animateTransform
                    attributeName="transform" type="rotate"
                    from={`0 ${p.x} ${p.y}`} to={`360 ${p.x} ${p.y}`}
                    dur="1.2s" repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Burst ring on complete */}
              <AnimatePresence>
                {done && (
                  <motion.circle
                    cx={p.x} cy={p.y}
                    initial={{ r: NODE_R, opacity: 0.7, strokeWidth: 3 }}
                    animate={{ r: NODE_R + 16, opacity: 0, strokeWidth: 0.5 }}
                    exit={{}}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    fill="none" stroke={cfg.color}
                  />
                )}
              </AnimatePresence>

              {/* Node circle */}
              <motion.circle
                cx={p.x} cy={p.y} r={NODE_R}
                fill={done ? cfg.color : 'none'}
                stroke={cfg.color} strokeWidth={done ? 0 : 2}
                opacity={done ? 1 : 0.4}
                animate={done ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.4 }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              />

              {/* Label */}
              <text
                x={p.x} y={p.y + NODE_R + 14}
                textAnchor="middle" fontSize={10}
                fill="rgba(255,255,255,0.35)"
              >
                {cfg.label}
              </text>

              {/* Duration */}
              {completedAgents[role] && (
                <text
                  x={p.x} y={p.y + NODE_R + 25}
                  textAnchor="middle" fontSize={9}
                  fill="rgba(255,255,255,0.25)"
                >
                  {completedAgents[role].duration_seconds.toFixed(1)}s
                </text>
              )}
            </g>
          )
        })}

        {/* Arbiter center */}
        {synthesizing && (
          <>
            <motion.circle
              cx={CX} cy={CY} r={26}
              fill="none" stroke={ARBITER_COLOR} strokeWidth={1.5}
              animate={{ r: [22, 30, 22], opacity: [0.25, 0.5, 0.25] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
              cx={CX} cy={CY} r={20}
              fill="none" stroke={ARBITER_COLOR} strokeWidth={1.5}
              animate={{ r: [18, 26, 18], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
          </>
        )}

        {isFinal && (
          <motion.circle
            cx={CX} cy={CY} r={28}
            fill="none" stroke={ARBITER_COLOR} strokeWidth={2}
            animate={{ r: [26, 32, 26], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <circle
          cx={CX} cy={CY} r={NODE_R}
          fill={isFinal ? ARBITER_COLOR : 'none'}
          stroke={ARBITER_COLOR} strokeWidth={isFinal ? 0 : 2}
          opacity={isStreaming || isFinal ? 1 : 0.3}
        />
        <text
          x={CX} y={CY + 4}
          textAnchor="middle" fontSize={11} fontWeight={700}
          fill={isFinal ? '#fff' : 'rgba(255,255,255,0.35)'}
        >
          Arbiter
        </text>
      </svg>

      {statusText && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs text-white/40 font-semibold text-center"
        >
          {statusText}
        </motion.p>
      )}
    </div>
  )
}
