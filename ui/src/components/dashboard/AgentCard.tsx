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

const COLORS: Record<string, { ring: string; glow: string; icon: string; bg: string }> = {
  indigo: { ring: 'ring-indigo-500/60', glow: 'shadow-[0_0_25px_rgba(99,102,241,0.3)]', icon: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  amber: { ring: 'ring-amber-500/60', glow: 'shadow-[0_0_25px_rgba(245,158,11,0.3)]', icon: 'text-amber-400', bg: 'bg-amber-500/10' },
  violet: { ring: 'ring-violet-500/60', glow: 'shadow-[0_0_25px_rgba(139,92,246,0.3)]', icon: 'text-violet-400', bg: 'bg-violet-500/10' },
  rose: { ring: 'ring-rose-500/60', glow: 'shadow-[0_0_25px_rgba(244,63,94,0.3)]', icon: 'text-rose-400', bg: 'bg-rose-500/10' },
  emerald: { ring: 'ring-emerald-500/60', glow: 'shadow-[0_0_25px_rgba(16,185,129,0.3)]', icon: 'text-emerald-400', bg: 'bg-emerald-500/10' },
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
  const color = COLORS[meta.color]
  const completed = !!event
  const isWorking = isStreaming && !completed

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`
        relative bg-white/5 backdrop-blur-xl border rounded-2xl p-5 transition-all duration-500
        ${completed ? `border-white/20 ring-2 ${color.ring} ${color.glow}` : 'border-white/10'}
      `}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center`}>
          <Icon size={20} className={color.icon} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">{meta.label}</h4>
          <p className="text-[11px] text-white/40">{meta.description}</p>
        </div>
      </div>

      {/* Status */}
      {isWorking && (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Loader2 size={14} className="animate-spin" />
          <span>Deliberating...</span>
        </div>
      )}

      {completed && event && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            {event.status === 'ok' ? (
              <CheckCircle2 size={14} className="text-emerald-400" />
            ) : (
              <XCircle size={14} className="text-rose-400" />
            )}
            <span className="text-white/60">{event.duration_seconds.toFixed(1)}s</span>
          </div>
          {event.preview && (
            <p className="text-xs text-white/50 line-clamp-3 leading-relaxed">{event.preview}</p>
          )}
        </div>
      )}

      {!isStreaming && !completed && (
        <p className="text-xs text-white/20">Idle</p>
      )}
    </motion.div>
  )
}
