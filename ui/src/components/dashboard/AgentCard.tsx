import { motion } from 'framer-motion'
import { Shield, Search, BarChart3, RefreshCw, Scale, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { AgentRole, SSEAgentEvent } from '../../api/types'
import { AGENT_META } from '../../api/types'

const ICONS: Record<AgentRole, typeof Shield> = {
  advocate: Shield,
  skeptic: Search,
  oracle: BarChart3,
  contrarian: RefreshCw,
  arbiter: Scale,
}

const COLOR_MAP: Record<string, { border: string; glow: string; icon: string; bg: string; pulse: string }> = {
  cyan:  { border: 'rgba(6,182,212,0.3)', glow: '0 0 40px rgba(6,182,212,0.2), 0 0 80px rgba(6,182,212,0.05)', icon: 'text-cyan-400', bg: 'bg-cyan-500/10', pulse: 'bg-cyan-400' },
  amber:   { border: 'rgba(245,158,11,0.3)', glow: '0 0 40px rgba(245,158,11,0.2), 0 0 80px rgba(245,158,11,0.05)', icon: 'text-amber-400', bg: 'bg-amber-500/10', pulse: 'bg-amber-400' },
  violet:  { border: 'rgba(139,92,246,0.3)', glow: '0 0 40px rgba(139,92,246,0.2), 0 0 80px rgba(139,92,246,0.05)', icon: 'text-violet-400', bg: 'bg-violet-500/10', pulse: 'bg-violet-400' },
  rose:    { border: 'rgba(244,63,94,0.3)', glow: '0 0 40px rgba(244,63,94,0.2), 0 0 80px rgba(244,63,94,0.05)', icon: 'text-rose-400', bg: 'bg-rose-500/10', pulse: 'bg-rose-400' },
  emerald: { border: 'rgba(16,185,129,0.3)', glow: '0 0 40px rgba(16,185,129,0.2), 0 0 80px rgba(16,185,129,0.05)', icon: 'text-emerald-400', bg: 'bg-emerald-500/10', pulse: 'bg-emerald-400' },
}

interface AgentCardProps {
  role: AgentRole
  event?: SSEAgentEvent
  isStreaming: boolean
  index: number
}

export default function AgentCard({ role, event, isStreaming, index }: AgentCardProps) {
  const meta = AGENT_META[role]
  const Icon = ICONS[role]
  const color = COLOR_MAP[meta.color]
  const completed = !!event
  const isWorking = isStreaming && !completed

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-[20px] p-5 transition-all duration-700"
      style={{
        background: completed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${completed ? color.border : 'rgba(255,255,255,0.04)'}`,
        boxShadow: completed ? color.glow : 'none',
      }}
    >
      {/* Working state shimmer */}
      {isWorking && (
        <div className="absolute inset-0 rounded-[20px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-[shimmer_2s_infinite]"
            style={{ animation: 'shimmer 2s infinite', backgroundSize: '200% 100%' }}
          />
        </div>
      )}

      {/* Icon + label */}
      <div className="flex items-center gap-3 mb-3 relative">
        <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center transition-all duration-500 ${completed ? 'scale-110' : ''}`}>
          <Icon size={19} className={`${color.icon} transition-all duration-500`} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white/90">{meta.label}</h4>
          <p className="text-[11px] text-white/25">{meta.description}</p>
        </div>
        {/* Status dot */}
        {isWorking && (
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${color.pulse} animate-pulse`} />
            <div className={`absolute inset-0 w-2 h-2 rounded-full ${color.pulse} animate-ping opacity-75`} />
          </div>
        )}
      </div>

      {/* Status */}
      {isWorking && (
        <div className="flex items-center gap-2 text-xs text-white/30 relative">
          <Loader2 size={13} className="animate-spin" />
          <span>Deliberating...</span>
        </div>
      )}

      {completed && event && (
        <div className="space-y-2 relative">
          <div className="flex items-center gap-2 text-xs">
            {event.status === 'ok' ? (
              <CheckCircle2 size={13} className="text-emerald-400" />
            ) : (
              <XCircle size={13} className="text-rose-400" />
            )}
            <span className="text-white/40 font-mono">{event.duration_seconds.toFixed(1)}s</span>
          </div>
          {event.preview && (
            <p className="text-xs text-white/35 line-clamp-3 leading-relaxed">{event.preview}</p>
          )}
        </div>
      )}

      {!isStreaming && !completed && (
        <p className="text-[11px] text-white/10 relative">Idle</p>
      )}
    </motion.div>
  )
}
