import { motion } from 'framer-motion'
import GlassCard from '../ui/GlassCard'

// Simulated DPO training loss curve (would come from real data in production)
const LOSS_DATA = [
  { gen: 0, loss: 0.693 },
  { gen: 1, loss: 0.52 },
  { gen: 2, loss: 0.41 },
  { gen: 3, loss: 0.35 },
  { gen: 4, loss: 0.31 },
  { gen: 5, loss: 0.28 },
]

export default function LossChart() {
  const maxLoss = Math.max(...LOSS_DATA.map((d) => d.loss))
  const minLoss = Math.min(...LOSS_DATA.map((d) => d.loss))
  const range = maxLoss - minLoss || 1
  const w = 320
  const h = 120
  const pad = 30

  const points = LOSS_DATA.map((d, i) => {
    const x = pad + (i / (LOSS_DATA.length - 1)) * (w - 2 * pad)
    const y = pad + (1 - (d.loss - minLoss) / range) * (h - 2 * pad)
    return { x, y, ...d }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <GlassCard className="p-5">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Training Loss Curve</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 160 }}>
        {/* Grid lines */}
        {[0.3, 0.45, 0.6].map((v) => {
          const y = pad + (1 - (v - minLoss) / range) * (h - 2 * pad)
          return (
            <g key={v}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />
              <text x={pad - 4} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="8">{v.toFixed(2)}</text>
            </g>
          )
        })}

        {/* Gradient area */}
        <defs>
          <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={`${pathD} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`}
          fill="url(#lossGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="#4F46E5"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />

        {/* Dots */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#4F46E5"
            stroke="#0f172a"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.15 }}
          />
        ))}

        {/* Gen labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={h - pad + 14} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8">
            Gen {p.gen}
          </text>
        ))}
      </svg>
    </GlassCard>
  )
}
