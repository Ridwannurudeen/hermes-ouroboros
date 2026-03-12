import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { BarChart3, Zap, Clock, Trophy, ChevronDown, ChevronUp } from 'lucide-react'

interface BenchmarkData {
  available: boolean
  total_claims: number
  summary: {
    avg_solo_quality: number
    avg_council_quality: number
    quality_improvement: number
    avg_council_confidence: number
    avg_solo_time: number
    avg_council_time: number
    council_wins: number
    solo_wins: number
    ties: number
    council_win_rate: number
  }
  results: {
    claim: string
    category: string
    ground_truth: string | null
    solo: { response: string; quality_score: number; elapsed_seconds: number }
    council: {
      verdict_label: string
      verdict_preview: string
      quality_score: number
      confidence_score: number
      elapsed_seconds: number
      has_web_evidence: boolean
      has_round2: boolean
      conflict_detected: boolean
    }
  }[]
}

function CountUp({ target, suffix }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(motionVal, target, { duration: 1.5, ease: 'easeOut' })
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => { controls.stop(); unsub() }
  }, [inView, target, motionVal, rounded])

  return <span ref={ref}>{display}{suffix || ''}</span>
}

function QualityBar({ label, score, color, delay }: { label: string; score: number; color: string; delay: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white/50">{label}</span>
        <span className={`text-sm font-bold font-mono ${color}`}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color === 'text-emerald-400' ? 'bg-emerald-500' : 'bg-white/20'}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ delay, duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function SpotlightCard({ result, index }: { result: BenchmarkData['results'][0]; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const qualityDelta = result.council.quality_score - result.solo.quality_score
  const Icon = expanded ? ChevronUp : ChevronDown

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="rounded-xl border border-white/[0.04] bg-white/[0.02] overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-sm text-white/70 leading-relaxed flex-1">{result.claim}</p>
          <Icon size={14} className="text-white/20 flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <span className="text-[10px] text-white/30">Solo: {result.solo.quality_score}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-400">Council: {result.council.quality_score}</span>
          </div>
          {qualityDelta > 0 && (
            <span className="text-[10px] font-bold text-emerald-400 ml-auto">+{qualityDelta} pts</span>
          )}
          {result.council.verdict_label && (
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
              {result.council.verdict_label}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/25 font-semibold mb-2">Solo Hermes-3</p>
              <p className="text-xs text-white/40 leading-relaxed line-clamp-[8]">{result.solo.response}</p>
              <p className="text-[10px] text-white/20 mt-2">{result.solo.elapsed_seconds}s</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/60 font-semibold mb-2">5-Agent Council</p>
              <p className="text-xs text-white/50 leading-relaxed line-clamp-[8]">{result.council.verdict_preview}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-white/20">
                <span>{result.council.elapsed_seconds}s</span>
                {result.council.has_web_evidence && <span>+ web sources</span>}
                {result.council.has_round2 && <span>+ rebuttals</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function BenchmarkShowcase() {
  const [data, setData] = useState<BenchmarkData | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/api/benchmark/council-vs-solo')
      .then((r) => {
        if (!r.ok) throw new Error('fail')
        return r.json()
      })
      .then((d) => {
        if (d.available) setData(d)
      })
      .catch(() => {})
  }, [])

  if (!data) return null

  const s = data.summary
  // Pick spotlight: top 3 where council won by the most
  const sorted = [...data.results]
    .filter((r) => r.council.quality_score > r.solo.quality_score)
    .sort((a, b) => (b.council.quality_score - b.solo.quality_score) - (a.council.quality_score - a.solo.quality_score))
  const spotlights = showAll ? data.results : sorted.slice(0, 3)

  return (
    <section id="benchmark" className="py-36 px-6 relative">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="section-label text-emerald-400/60 mb-4">Proof</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">
            Council vs Solo
          </h2>
          <p className="text-white/30 text-lg max-w-2xl mx-auto leading-relaxed">
            We ran {data.total_claims} claims through a single Hermes model and our 5-agent council.
            The numbers speak for themselves.
          </p>
        </motion.div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-center"
          >
            <Trophy size={16} className="text-emerald-400 mx-auto mb-2 opacity-60" />
            <p className="text-3xl font-black font-mono text-emerald-400">
              <CountUp target={s.council_win_rate} suffix="%" />
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/25 mt-1">Council Win Rate</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5 text-center"
          >
            <BarChart3 size={16} className="text-indigo-400 mx-auto mb-2 opacity-60" />
            <p className="text-3xl font-black font-mono text-white/90">
              <CountUp target={s.quality_improvement} suffix="%" />
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/25 mt-1">Quality Improvement</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5 text-center"
          >
            <Zap size={16} className="text-amber-400 mx-auto mb-2 opacity-60" />
            <p className="text-3xl font-black font-mono text-white/90">
              <CountUp target={s.avg_council_confidence} suffix="" />
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/25 mt-1">Avg Confidence</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5 text-center"
          >
            <Clock size={16} className="text-violet-400 mx-auto mb-2 opacity-60" />
            <p className="text-3xl font-black font-mono text-white/90">
              {data.total_claims}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/25 mt-1">Claims Tested</p>
          </motion.div>
        </div>

        {/* Quality Comparison Bars */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-6 mb-10 max-w-lg mx-auto"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Average Quality Score</h3>
          <div className="space-y-4">
            <QualityBar label="Solo Hermes-3" score={s.avg_solo_quality} color="text-white/40" delay={0.2} />
            <QualityBar label="5-Agent Council" score={s.avg_council_quality} color="text-emerald-400" delay={0.4} />
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
            <span className="text-[10px] text-white/20">Win / Loss / Tie</span>
            <span className="text-xs font-mono text-white/50">
              <span className="text-emerald-400">{s.council_wins}W</span>
              {' / '}
              <span className="text-rose-400">{s.solo_wins}L</span>
              {' / '}
              <span className="text-white/30">{s.ties}T</span>
            </span>
          </div>
        </motion.div>

        {/* Spotlight Examples */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              {showAll ? 'All Results' : 'Where Council Shines'}
            </h3>
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {showAll ? 'Show highlights' : `View all ${data.total_claims} results`}
            </button>
          </div>
          {spotlights.map((r, i) => (
            <SpotlightCard key={r.claim} result={r} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
