import StatTile from '../ui/StatTile'
import GlassCard from '../ui/GlassCard'
import LossChart from './LossChart'
import type { StatsResponse } from '../../api/types'
import { BarChart3 } from 'lucide-react'

interface StatsPanelProps {
  stats: StatsResponse | null
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-white/30">Sign in to view stats</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 size={18} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Dashboard Stats</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total Sessions" value={stats.total_sessions} delay={0} />
        <StatTile label="Avg Confidence" value={`${stats.average_confidence_all_time.toFixed(0)}%`} sub="All time" delay={0.1} />
        <StatTile label="Recent Avg" value={`${stats.average_confidence_last_10.toFixed(0)}%`} sub="Last 10" delay={0.2} />
        <StatTile label="Skills Created" value={stats.skills_created} delay={0.3} />
      </div>

      {/* Trajectory stats */}
      {stats.trajectory && (
        <GlassCard className="p-5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Training Data</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-lg font-bold text-white">{stats.trajectory.total_trajectories}</p>
              <p className="text-[11px] text-white/40">Total Trajectories</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{stats.trajectory.recent_trajectories}</p>
              <p className="text-[11px] text-white/40">Recent</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{stats.trajectory.avg_quality_score.toFixed(1)}</p>
              <p className="text-[11px] text-white/40">Avg Quality</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Training status */}
      {stats.training && (
        <GlassCard className="p-5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Training Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Generation</span>
              <span className="text-white font-mono">{stats.training.current_generation}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Auto-train</span>
              <span className={stats.training.auto_train_enabled ? 'text-emerald-400' : 'text-white/30'}>
                {stats.training.auto_train_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Status</span>
              <span className="text-white/70">{stats.training.status}</span>
            </div>
          </div>
        </GlassCard>
      )}

      <LossChart />
    </div>
  )
}
