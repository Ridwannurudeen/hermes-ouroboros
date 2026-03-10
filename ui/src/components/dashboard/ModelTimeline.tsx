import { motion } from 'framer-motion'
import GlassCard from '../ui/GlassCard'
import type { LoopStatus } from '../../api/types'
import { GitBranch, Zap, Database, Cpu } from 'lucide-react'

interface ModelTimelineProps {
  loopStatus: LoopStatus | null
}

export default function ModelTimeline({ loopStatus }: ModelTimelineProps) {
  if (!loopStatus) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-white/30">Sign in to view DPO loop status</p>
      </div>
    )
  }

  const steps = [
    { icon: Database, label: 'Trajectories', value: `${loopStatus.trajectories_total} total`, sub: `${loopStatus.trajectories_new} new`, done: true },
    { icon: Zap, label: 'Min for Training', value: `${loopStatus.min_for_training}`, sub: loopStatus.ready ? 'Ready' : 'Collecting...', done: loopStatus.ready },
    { icon: GitBranch, label: 'Generation', value: `v${loopStatus.generation}`, sub: loopStatus.last_trained || 'Not yet', done: loopStatus.generation > 0 },
    { icon: Cpu, label: 'Active Model', value: loopStatus.model_active, sub: loopStatus.status, done: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GitBranch size={18} className="text-violet-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">DPO Training Loop</h2>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard hover className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.done ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                <step.icon size={18} className={step.done ? 'text-emerald-400' : 'text-white/30'} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white/80">{step.label}</p>
                <p className="text-xs text-white/40">{step.sub}</p>
              </div>
              <p className="text-sm font-mono text-white/60">{step.value}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
