import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Play, Activity, Database, GitBranch, TrendingDown } from 'lucide-react'

interface ModelVersion {
  name: string
  loss: number | null
  steps: number | null
  dry_run: boolean
  mode: string
}

interface LoopData {
  loop: {
    current_version: string
    high_quality_total: number
    new_high_quality_since_latest: number
    auto_train_enabled: boolean
    auto_train_threshold: number
  }
  trajectories: { total: number; high_quality: number; average_confidence: number }
  dpo: { total_pairs: number; sessions_with_pairs: number }
  sessions: { total: number; average_confidence: number }
  model_history: ModelVersion[]
}

function LossCurve({ versions, animating, progress }: { versions: ModelVersion[]; animating: boolean; progress: number }) {
  const points = versions.filter(v => v.loss !== null).map((v, i) => ({ x: i, y: v.loss! }))
  if (points.length < 2) return null

  const w = 320, h = 140, pad = 30
  const maxLoss = Math.max(...points.map(p => p.y)) * 1.1
  const minLoss = Math.min(...points.map(p => p.y)) * 0.9
  const range = maxLoss - minLoss || 1

  const toX = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2)
  const toY = (loss: number) => pad + ((maxLoss - loss) / range) * (h - pad * 2)

  const visibleCount = animating ? Math.max(1, Math.floor(progress * points.length)) : points.length
  const visiblePoints = points.slice(0, visibleCount)

  const pathD = visiblePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad + t * (h - pad * 2)
        return <line key={t} x1={pad} y1={y} x2={w - pad} y2={y} stroke="white" strokeOpacity={0.04} />
      })}

      {/* Y-axis labels */}
      <text x={pad - 4} y={pad + 4} textAnchor="end" fill="white" fillOpacity={0.2} fontSize={8} fontFamily="monospace">
        {maxLoss.toFixed(1)}
      </text>
      <text x={pad - 4} y={h - pad + 4} textAnchor="end" fill="white" fillOpacity={0.2} fontSize={8} fontFamily="monospace">
        {minLoss.toFixed(1)}
      </text>

      {/* Loss curve */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Glow */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.15} />

      {/* Data points */}
      {visiblePoints.map((p, i) => (
        <g key={i}>
          <circle cx={toX(p.x)} cy={toY(p.y)} r={4} fill="#06060e" stroke="#6366f1" strokeWidth={2} />
          <text
            x={toX(p.x)}
            y={toY(p.y) - 10}
            textAnchor="middle"
            fill="#a5b4fc"
            fontSize={8}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {p.y.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X-axis version labels */}
      {visiblePoints.map((p, i) => (
        <text
          key={`label-${i}`}
          x={toX(p.x)}
          y={h - 6}
          textAnchor="middle"
          fill="white"
          fillOpacity={0.15}
          fontSize={7}
          fontFamily="monospace"
        >
          v{p.x}
        </text>
      ))}

      {/* Animated leading dot */}
      {animating && visiblePoints.length > 0 && (
        <circle
          cx={toX(visiblePoints[visiblePoints.length - 1].x)}
          cy={toY(visiblePoints[visiblePoints.length - 1].y)}
          r={6}
          fill="#6366f1"
          opacity={0.6}
        >
          <animate attributeName="r" values="4;8;4" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

function CountUp({ target, duration = 2000, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [current, setCurrent] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let start = 0
    const startTime = performance.now()
    const step = (ts: number) => {
      const elapsed = ts - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return <span ref={ref}>{current.toLocaleString()}{suffix}</span>
}

export default function TrainingLab() {
  const [data, setData] = useState<LoopData | null>(null)
  const [animating, setAnimating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [genCounter, setGenCounter] = useState(0)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    fetch('/api/loop/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
  }, [])

  const startAnimation = () => {
    if (animating || !data?.model_history?.length) return
    setAnimating(true)
    setProgress(0)
    setGenCounter(0)

    const totalDuration = 4000
    const startTime = performance.now()
    const totalGens = data.model_history.filter(v => v.loss !== null).length

    const step = (ts: number) => {
      const elapsed = ts - startTime
      const p = Math.min(elapsed / totalDuration, 1)
      setProgress(p)
      setGenCounter(Math.floor(p * totalGens))

      if (p < 1) {
        animRef.current = requestAnimationFrame(step)
      } else {
        setAnimating(false)
        setGenCounter(totalGens)
      }
    }
    animRef.current = requestAnimationFrame(step)
  }

  if (!data) return null

  const versions = data.model_history || []
  const lossVersions = versions.filter(v => v.loss !== null)
  const latestLoss = lossVersions.length > 0 ? lossVersions[lossVersions.length - 1].loss : null
  const firstLoss = lossVersions.length > 0 ? lossVersions[0].loss : null
  const lossReduction = firstLoss && latestLoss ? ((1 - latestLoss / firstLoss) * 100) : 0

  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-violet-500/[0.03] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/[0.06] mb-4">
            <Activity size={11} className="text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Live Training Lab</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Watch the AI <span className="gradient-text">Get Smarter</span>
          </h2>
          <p className="text-white/30 text-base max-w-xl mx-auto leading-relaxed">
            Real training data. Real loss curve. Every debate generates DPO pairs — and the model trains itself.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
              <Database size={14} className="text-indigo-400/50 mb-3" />
              <div className="text-2xl font-black font-mono text-white">
                <CountUp target={data.dpo.total_pairs} />
              </div>
              <div className="text-[10px] text-white/20 uppercase tracking-wider mt-1">DPO Training Pairs</div>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
              <GitBranch size={14} className="text-emerald-400/50 mb-3" />
              <div className="text-2xl font-black font-mono text-white">
                <CountUp target={data.sessions.total} />
              </div>
              <div className="text-[10px] text-white/20 uppercase tracking-wider mt-1">Council Sessions</div>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
              <TrendingDown size={14} className="text-rose-400/50 mb-3" />
              <div className="text-2xl font-black font-mono text-emerald-400">
                {lossReduction > 0 ? <CountUp target={Math.round(lossReduction)} suffix="%" /> : '—'}
              </div>
              <div className="text-[10px] text-white/20 uppercase tracking-wider mt-1">Loss Reduction</div>
            </div>
          </motion.div>

          {/* Loss curve visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 rounded-xl border border-white/[0.04] bg-white/[0.02] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white/70">Training Loss Curve</h3>
                <p className="text-[10px] text-white/20 mt-0.5">
                  {lossVersions.length} generations trained · {animating ? 'Replaying...' : 'Click to replay'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Generation counter */}
                <div className="text-right">
                  <div className="text-xs text-white/20 uppercase tracking-wider">Generation</div>
                  <div className="text-xl font-black font-mono text-indigo-400">
                    {animating ? genCounter : lossVersions.length}
                  </div>
                </div>
                <button
                  onClick={startAnimation}
                  disabled={animating || lossVersions.length < 2}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {animating ? (
                    <><Activity size={14} className="animate-pulse" /> Training...</>
                  ) : (
                    <><Play size={14} /> Replay Training</>
                  )}
                </button>
              </div>
            </div>

            {lossVersions.length >= 2 ? (
              <LossCurve versions={versions} animating={animating} progress={progress} />
            ) : (
              <div className="h-[140px] flex items-center justify-center text-xs text-white/20">
                Training data will appear after the first training cycle.
              </div>
            )}

            {/* Epoch progress bar during animation */}
            <AnimatePresence>
              {animating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className="flex items-center justify-between text-[10px] text-white/20 mb-1">
                    <span>Training progress</span>
                    <span className="font-mono">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Model version timeline */}
            {lossVersions.length > 0 && (
              <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
                {lossVersions.map((v, i) => (
                  <div
                    key={v.name}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
                      (!animating || i < genCounter)
                        ? 'border-indigo-500/20 bg-indigo-500/[0.06] text-indigo-300'
                        : 'border-white/[0.04] bg-white/[0.01] text-white/15'
                    }`}
                  >
                    <div className="font-bold">{v.name}</div>
                    <div className="text-white/20">{v.mode} · loss {v.loss?.toFixed(3)}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
