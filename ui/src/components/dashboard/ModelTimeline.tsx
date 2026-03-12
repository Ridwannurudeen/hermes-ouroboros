import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '../ui/GlassCard'
import type { LoopStatus } from '../../api/types'
import { apiFetch } from '../../api/client'
import { GitBranch, Zap, Database, Cpu, ArrowRight, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

interface ModelTimelineProps {
  loopStatus: LoopStatus | null
}

interface ModelHistoryEntry {
  name: string
  loss?: number
  steps?: number
  dry_run?: boolean
  mode?: string
}

interface FullLoopStatus {
  loop: {
    generation: number
    trajectories_total: number
    trajectories_new: number
    min_for_training: number
    ready: boolean
    high_quality_total?: number
    new_high_quality_since_latest?: number
    remaining_until_next_cycle?: number
  }
  dpo: {
    total_pairs: number
    sessions_with_pairs: number
  }
  model_history: ModelHistoryEntry[]
  current_version: string
  model_active: string
  status: string
  last_trained: string | null
}

interface BenchmarkResult {
  available: boolean
  confidence_delta?: number
  quality_delta?: number
  improvement_pct?: number
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const step = Math.max(1, Math.floor(value / 20))
    const t = setInterval(() => {
      setDisplay((d) => {
        if (d + step >= value) { clearInterval(t); return value }
        return d + step
      })
    }, 40)
    return () => clearInterval(t)
  }, [value])
  return <>{display}</>
}

export default function ModelTimeline({ loopStatus }: ModelTimelineProps) {
  const [fullStatus, setFullStatus] = useState<FullLoopStatus | null>(null)
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null)

  useEffect(() => {
    apiFetch<FullLoopStatus>('/api/loop/status').then(setFullStatus).catch(() => {})
    apiFetch<BenchmarkResult>('/api/compare/benchmark').then(setBenchmark).catch(() => {})
  }, [])

  if (!loopStatus) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-white/30">Sign in to view DPO loop status</p>
      </div>
    )
  }

  const pipelineStages = [
    {
      label: 'Data Collection',
      icon: Database,
      value: `${loopStatus.trajectories_total} trajectories`,
      sub: `${loopStatus.trajectories_new} new`,
      progress: Math.min(100, (loopStatus.trajectories_new / loopStatus.min_for_training) * 100),
      done: loopStatus.ready,
    },
    {
      label: 'Training',
      icon: Zap,
      value: loopStatus.ready ? 'Ready' : `${loopStatus.min_for_training - loopStatus.trajectories_new} more needed`,
      sub: loopStatus.last_trained || 'Not yet trained',
      progress: loopStatus.ready ? 100 : 0,
      done: loopStatus.generation > 0,
    },
    {
      label: 'Deployment',
      icon: Cpu,
      value: loopStatus.model_active,
      sub: `Generation ${loopStatus.generation}`,
      progress: 100,
      done: true,
    },
  ]

  const modelHistory = fullStatus?.model_history || []
  const dpoPairs = fullStatus?.dpo?.total_pairs || 0
  const dpoSessions = fullStatus?.dpo?.sessions_with_pairs || 0
  const totalSessions = fullStatus?.loop?.trajectories_total || loopStatus.trajectories_total
  const dpoPct = totalSessions > 0 ? Math.round((dpoSessions / totalSessions) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <GitBranch size={20} className="text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">DPO Training Dashboard</h2>
          <p className="text-xs text-white/30">Self-improving adversarial intelligence pipeline</p>
        </div>
      </div>

      {/* Section 1: Training Pipeline */}
      <GlassCard className="p-5">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">Training Pipeline</h3>
        <div className="flex items-center gap-2">
          {pipelineStages.map((stage, i) => {
            const Icon = stage.icon
            return (
              <div key={stage.label} className="flex items-center gap-2 flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex-1"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stage.done ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                      {stage.done ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <Icon size={14} className="text-white/30" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-white/60">{stage.label}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden mb-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stage.progress}%` }}
                      transition={{ delay: i * 0.15 + 0.3, duration: 0.8 }}
                      className={`h-full rounded-full ${stage.done ? 'bg-emerald-500/50' : 'bg-cyan-500/40'}`}
                    />
                  </div>
                  <p className="text-[10px] text-white/50 font-mono">{stage.value}</p>
                  <p className="text-[10px] text-white/25">{stage.sub}</p>
                </motion.div>
                {i < pipelineStages.length - 1 && (
                  <ArrowRight size={14} className="text-white/10 flex-shrink-0 mt-[-20px]" />
                )}
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Section 2: Model History */}
      {modelHistory.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">Model History</h3>
          <div className="relative pl-6 space-y-4">
            {/* Timeline line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/30 via-cyan-500/20 to-transparent" />
            {modelHistory.map((entry, i) => {
              const prevLoss = i > 0 ? modelHistory[i - 1].loss : undefined
              const lossDelta = entry.loss && prevLoss ? entry.loss - prevLoss : undefined
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  {/* Dot on timeline */}
                  <div className="absolute left-[-18px] top-2 w-2.5 h-2.5 rounded-full border-2 border-violet-500/40 bg-[#0a0a14]" />
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono font-bold text-violet-300/80 bg-violet-500/10 px-2 py-0.5 rounded">
                      {entry.name}
                    </span>
                    {entry.mode && (
                      <span className="text-[10px] font-semibold text-cyan-300/50 bg-cyan-500/10 px-1.5 py-0.5 rounded uppercase">
                        {entry.mode}
                      </span>
                    )}
                    {entry.dry_run && (
                      <span className="text-[10px] text-amber-400/50 bg-amber-500/10 px-1.5 py-0.5 rounded">dry run</span>
                    )}
                    {entry.loss != null && (
                      <span className="text-[10px] font-mono text-white/40">loss: {entry.loss.toFixed(4)}</span>
                    )}
                    {entry.steps != null && (
                      <span className="text-[10px] font-mono text-white/30">{entry.steps} steps</span>
                    )}
                    {lossDelta != null && lossDelta < 0 && (
                      <span className="text-[10px] font-mono text-emerald-400/60 flex items-center gap-0.5">
                        <TrendingUp size={10} /> {Math.abs(lossDelta).toFixed(4)} improved
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Section 3: DPO Quality Stats */}
      <GlassCard className="p-5">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">DPO Quality</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-cyan-300 font-mono"><AnimatedNumber value={dpoPairs} /></p>
            <p className="text-[10px] text-white/30 mt-1">Total Pairs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-violet-300 font-mono"><AnimatedNumber value={dpoSessions} /></p>
            <p className="text-[10px] text-white/30 mt-1">Sessions w/ Pairs</p>
          </div>
          <div className="text-center">
            <span className="inline-block px-2 py-0.5 rounded text-lg font-black text-emerald-400 bg-emerald-500/10">70+</span>
            <p className="text-[10px] text-white/30 mt-1">Quality Threshold</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-amber-300 font-mono">{dpoPct}%</p>
            <p className="text-[10px] text-white/30 mt-1">Pair Rate</p>
          </div>
        </div>
      </GlassCard>

      {/* Section 4: Before/After */}
      <GlassCard className="p-5">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Model Improvement</h3>
        {benchmark?.available ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              {benchmark.confidence_delta != null && (
                <div className="text-center">
                  <p className={`text-lg font-black font-mono ${benchmark.confidence_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {benchmark.confidence_delta >= 0 ? '+' : ''}{benchmark.confidence_delta.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-white/30">Confidence Delta</p>
                </div>
              )}
              {benchmark.quality_delta != null && (
                <div className="text-center">
                  <p className={`text-lg font-black font-mono ${benchmark.quality_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {benchmark.quality_delta >= 0 ? '+' : ''}{benchmark.quality_delta.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-white/30">Quality Delta</p>
                </div>
              )}
              {benchmark.improvement_pct != null && (
                <div className="text-center">
                  <p className="text-lg font-black font-mono text-cyan-400">{benchmark.improvement_pct.toFixed(1)}%</p>
                  <p className="text-[10px] text-white/30">Improvement</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button className="flex items-center gap-1 text-[10px] text-cyan-400/60 hover:text-cyan-400 font-semibold transition-colors">
                View full comparison <ArrowRight size={10} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <Clock size={14} className="text-white/20" />
            <p className="text-xs text-white/30">Collecting data for comparison — run more sessions to unlock model benchmarks.</p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
