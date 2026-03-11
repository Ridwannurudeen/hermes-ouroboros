import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { apiFetch } from '../../api/client'
import GlassCard from '../ui/GlassCard'
import { Scale } from 'lucide-react'

interface Comparison {
  query: string
  base_confidence: number
  trained_confidence: number
  delta: number
  base_quality: number
  trained_quality: number
  quality_delta: number
}

interface BenchmarkData {
  available: boolean
  avg_confidence_delta: number
  avg_quality_delta: number
  improvement_pct: number
  comparisons: Comparison[]
}

function AnimatedValue({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState('0.0')

  useEffect(() => {
    if (!isInView) return
    const abs = Math.abs(value)
    const start = performance.now()
    const dur = 1200
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay((ease * abs).toFixed(1))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, value])

  return <span ref={ref}>{prefix}{value < 0 ? '-' : '+'}{display}{suffix}</span>
}

function ProgressRing({ score, max, color, label }: { score: number; max: number; color: string; label: string }) {
  const ref = useRef<SVGCircleElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true })
  const r = 42
  const circ = 2 * Math.PI * r
  const target = circ - (score / max) * circ

  useEffect(() => {
    if (isInView && ref.current) {
      ref.current.style.strokeDashoffset = String(target)
    }
  }, [isInView, target])

  return (
    <div ref={containerRef} className="text-center">
      <svg viewBox="0 0 110 110" className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px]">
        <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle
          ref={ref}
          cx={55} cy={55} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
        <text x={55} y={55} textAnchor="middle" dominantBaseline="central"
          fontSize={20} fontWeight={800} fill="white">
          {score}
        </text>
      </svg>
      <p className="text-[11px] text-white/30 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

function DeltaPill({ value }: { value: number }) {
  if (value > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">+{value}</span>
  if (value < 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400">{value}</span>
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/30">0</span>
}

function BarComparison({ c }: { c: Comparison }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const confDelta = c.trained_confidence - c.base_confidence

  return (
    <GlassCard className="p-4" delay={0}>
      <p className="text-xs font-semibold text-white/70 mb-3 leading-relaxed">{c.query}</p>
      <div ref={ref} className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-white/30">
          <span className="w-16 text-right shrink-0">Confidence</span>
          <div className="flex-1 h-3 rounded-full bg-white/[0.04] relative overflow-hidden">
            <div
              className="absolute h-full rounded-full bg-white/10 transition-all duration-1000 ease-out"
              style={{ width: isInView ? `${c.base_confidence}%` : '0%' }}
            />
            <div
              className="absolute h-1.5 top-[3px] rounded-full bg-emerald-500/80 transition-all duration-1000 ease-out delay-200"
              style={{ width: isInView ? `${c.trained_confidence}%` : '0%' }}
            />
          </div>
          <span className="w-7 shrink-0 font-bold text-white/50">{c.trained_confidence}</span>
          <DeltaPill value={confDelta} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/30">
          <span className="w-16 text-right shrink-0">Quality</span>
          <div className="flex-1 h-3 rounded-full bg-white/[0.04] relative overflow-hidden">
            <div
              className="absolute h-full rounded-full bg-white/10 transition-all duration-1000 ease-out"
              style={{ width: isInView ? `${c.base_quality}%` : '0%' }}
            />
            <div
              className="absolute h-1.5 top-[3px] rounded-full bg-emerald-500/80 transition-all duration-1000 ease-out delay-200"
              style={{ width: isInView ? `${c.trained_quality}%` : '0%' }}
            />
          </div>
          <span className="w-7 shrink-0 font-bold text-white/50">{c.trained_quality}</span>
          <DeltaPill value={c.quality_delta} />
        </div>
      </div>
    </GlassCard>
  )
}

export default function ComparisonPanel() {
  const [data, setData] = useState<BenchmarkData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<BenchmarkData>('/api/compare/benchmark')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <GlassCard className="p-5">
        <p className="text-sm text-white/40">{error}</p>
      </GlassCard>
    )
  }

  if (!data || !data.available || !data.comparisons?.length) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-sm text-white/30">
          {data ? 'No benchmark comparison available.' : 'Loading comparison data...'}
        </p>
      </GlassCard>
    )
  }

  const avgBase = Math.round(data.comparisons.reduce((s, c) => s + c.base_confidence, 0) / data.comparisons.length)
  const avgTrained = Math.round(data.comparisons.reduce((s, c) => s + c.trained_confidence, 0) / data.comparisons.length)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Scale size={18} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Model Comparison</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { value: data.avg_confidence_delta, label: 'Confidence Delta', suffix: '%' },
          { value: data.avg_quality_delta, label: 'Quality Delta', suffix: '%' },
          { value: data.improvement_pct, label: 'Questions Improved', suffix: '%' },
        ].map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`rounded-2xl border p-4 ${
              card.value < 0
                ? 'border-l-rose-500/40 bg-white/[0.02] border-white/[0.04]'
                : 'border-l-emerald-500/40 bg-white/[0.02] border-white/[0.04]'
            }`}
            style={{ borderLeftWidth: 3 }}
          >
            <p className={`text-2xl font-extrabold ${card.value < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              <AnimatedValue value={card.value} suffix={card.suffix} />
            </p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Dual progress rings */}
      <div className="flex justify-center gap-10 sm:gap-16 py-4">
        <ProgressRing score={avgBase} max={100} color="rgba(255,255,255,0.15)" label="Base Model" />
        <ProgressRing score={avgTrained} max={100} color="#10b981" label="Trained Model" />
      </div>

      {/* Per-question bar comparisons */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider px-1">Per-Question Breakdown</h3>
        {data.comparisons.map((c) => (
          <BarComparison key={c.query} c={c} />
        ))}
      </div>
    </div>
  )
}
