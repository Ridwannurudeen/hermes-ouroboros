import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { TrendingDown, Database, Zap, FlaskConical, ExternalLink } from 'lucide-react'

interface LoopData {
  dpo: { total_pairs: number; sessions_with_pairs: number }
  sessions: { total: number; average_confidence: number }
  model_history: { name: string; loss: number; steps: number; mode: string }[]
}

function CountUp({ target, decimals = 0, suffix = '' }: { target: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const motionVal = useMotionValue(0)
  const display = useTransform(motionVal, (v) => v.toFixed(decimals))
  const [text, setText] = useState(decimals > 0 ? '0.000' : '0')

  useEffect(() => {
    if (!inView) return
    const controls = animate(motionVal, target, { duration: 1.5, ease: 'easeOut' })
    const unsub = display.on('change', (v) => setText(v))
    return () => { controls.stop(); unsub() }
  }, [inView, target, motionVal, display])

  return <span ref={ref}>{text}{suffix}</span>
}

/* ---------- Training Loss Curve ---------- */
function LossCurve({ versions }: { versions: LoopData['model_history'] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  if (versions.length < 2) return null

  const losses = versions.map((v) => v.loss)
  const maxLoss = Math.max(...losses) * 1.1
  const minLoss = Math.min(...losses) * 0.85

  const width = 100
  const height = 60
  const padX = 8
  const padY = 6
  const plotW = width - padX * 2
  const plotH = height - padY * 2

  const points = versions.map((v, i) => {
    const x = padX + (i / (versions.length - 1)) * plotW
    const y = padY + ((maxLoss - v.loss) / (maxLoss - minLoss)) * plotH
    return { x, y, ...v }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  // Area fill under the curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padY + plotH} L ${points[0].x} ${padY + plotH} Z`

  const totalReduction = ((losses[0] - losses[losses.length - 1]) / losses[0] * 100).toFixed(0)

  return (
    <div ref={ref} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown size={14} className="text-emerald-400 opacity-60" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Training Loss Curve</h4>
        </div>
        <span className="text-xs font-bold text-emerald-400">-{totalReduction}% reduction</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={padX} x2={width - padX}
            y1={padY + frac * plotH} y2={padY + frac * plotH}
            stroke="rgba(255,255,255,0.04)" strokeWidth={0.3}
          />
        ))}

        {/* Area fill */}
        <motion.path
          d={areaD}
          fill="url(#lossFill)"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
        />

        {/* Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#lossStroke)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={inView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <motion.g key={p.name}
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.3 + i * 0.15 }}
          >
            <circle cx={p.x} cy={p.y} r={2} fill="#10b981" />
            <circle cx={p.x} cy={p.y} r={4} fill="none" stroke="#10b981" strokeWidth={0.5} opacity={0.3} />
            <text x={p.x} y={p.y - 5} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={3.5} fontFamily="monospace">
              {p.loss.toFixed(2)}
            </text>
            <text x={p.x} y={padY + plotH + 5} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={3} fontFamily="monospace">
              {p.name.replace('adapter_', '')}
            </text>
          </motion.g>
        ))}

        {/* Gradients */}
        <defs>
          <linearGradient id="lossStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="lossFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <p className="text-[10px] text-white/20 text-center mt-2">
        5 self-improvement cycles on Hermes-3-Llama-3.1-8B (LoRA r=16)
      </p>
    </div>
  )
}

/* ---------- Finding Card ---------- */
function FindingCard({ number, title, stat, statSuffix, description, color, delay }: {
  number: number; title: string; stat: number; statSuffix: string
  description: string; color: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5"
    >
      <span className="text-[10px] font-bold text-white/15 uppercase tracking-wider">Finding {number}</span>
      <h4 className="text-sm font-bold text-white/70 mt-1 mb-3">{title}</h4>
      <p className={`text-3xl font-black font-mono ${color} mb-2`}>
        <CountUp target={stat} decimals={statSuffix === '%' ? 0 : statSuffix === 'x' ? 1 : 0} suffix={statSuffix} />
      </p>
      <p className="text-xs text-white/30 leading-relaxed">{description}</p>
    </motion.div>
  )
}

/* ---------- Main ---------- */
export default function ResearchFindings() {
  const [data, setData] = useState<LoopData | null>(null)

  useEffect(() => {
    fetch('/api/loop/status')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d) })
      .catch(() => {})
  }, [])

  if (!data) return null

  const versions = data.model_history || []
  const pairsPerSession = data.dpo.total_pairs / Math.max(data.dpo.sessions_with_pairs, 1)
  const lossReduction = versions.length >= 2
    ? ((versions[0].loss - versions[versions.length - 1].loss) / versions[0].loss * 100)
    : 0

  return (
    <section id="research" className="py-36 px-6 relative">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="section-label text-amber-400/60 mb-4">Research</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">
            What We Found
          </h2>
          <p className="text-white/30 text-lg max-w-2xl mx-auto leading-relaxed">
            Adversarial debate generates high-quality preference data automatically.
            No human labeling. The debate <em>is</em> the training signal.
          </p>
        </motion.div>

        {/* Key Findings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <FindingCard
            number={1}
            title="DPO Pairs Generated"
            stat={data.dpo.total_pairs}
            statSuffix=""
            description={`From ${data.sessions.total} sessions — ${pairsPerSession.toFixed(1)} pairs per session. Each debate automatically produces preference data.`}
            color="text-indigo-400"
            delay={0}
          />
          <FindingCard
            number={2}
            title="Training Loss Reduction"
            stat={Math.round(lossReduction)}
            statSuffix="%"
            description={`Across ${versions.length} self-improvement cycles. Loss: ${versions[0]?.loss.toFixed(2)} → ${versions[versions.length - 1]?.loss.toFixed(2)} on Hermes-3-8B.`}
            color="text-emerald-400"
            delay={0.1}
          />
          <FindingCard
            number={3}
            title="Avg Confidence Score"
            stat={Math.round(data.sessions.average_confidence)}
            statSuffix="/100"
            description="Bayesian confidence across all sessions. The Arbiter calibrates posterior probability from multi-agent evidence."
            color="text-amber-400"
            delay={0.2}
          />
        </div>

        {/* Training Loss Curve */}
        {versions.length >= 2 && (
          <div className="max-w-lg mx-auto mb-10">
            <LossCurve versions={versions} />
          </div>
        )}

        {/* Key Insight Box */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative rounded-xl p-[1px] overflow-hidden max-w-2xl mx-auto mb-10"
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-emerald-500/20" />
          <div className="relative rounded-xl bg-[#0a0a14] p-6">
            <div className="flex items-start gap-3">
              <FlaskConical size={18} className="text-violet-400 flex-shrink-0 mt-0.5 opacity-60" />
              <div>
                <h4 className="text-sm font-bold text-white/80 mb-2">The Key Insight</h4>
                <p className="text-sm text-white/50 leading-relaxed">
                  When five agents with distinct intellectual traditions debate a claim,
                  the Arbiter's verdict creates a natural preference signal. Responses that survive
                  adversarial scrutiny are demonstrably more rigorous than those that don't.
                  This turns every user session into labeled training data — no human annotation required.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dataset Link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-6"
        >
          <a
            href="https://huggingface.co/datasets/Ridwannurudeen/hermes-adversarial-dpo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-sm text-white/50 hover:text-white/80"
          >
            <Database size={14} className="text-indigo-400" />
            <span>DPO Dataset on HuggingFace</span>
            <ExternalLink size={11} className="opacity-40" />
          </a>
          <a
            href="https://github.com/Ridwannurudeen/hermes-ouroboros"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-sm text-white/50 hover:text-white/80"
          >
            <Zap size={14} className="text-emerald-400" />
            <span>Source Code</span>
            <ExternalLink size={11} className="opacity-40" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
