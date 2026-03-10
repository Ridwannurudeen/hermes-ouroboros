import { motion } from 'framer-motion'

const AGENTS = [
  { label: 'Advocate', angle: 0, color: '#818cf8', glow: 'rgba(129,140,248,0.4)' },
  { label: 'Skeptic', angle: 72, color: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
  { label: 'Oracle', angle: 144, color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
  { label: 'Contrarian', angle: 216, color: '#fb7185', glow: 'rgba(251,113,133,0.4)' },
  { label: 'Arbiter', angle: 288, color: '#34d399', glow: 'rgba(52,211,153,0.4)' },
]

export default function OuroborosRing() {
  const cx = 200
  const cy = 200
  const r = 130

  return (
    <div className="flex justify-center">
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 scale-150">
          <div className="w-full h-full rounded-full bg-indigo-500/[0.05]" />
        </div>

        <svg viewBox="0 0 400 400" className="w-72 h-72 md:w-96 md:h-96 relative">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.6" />
              <stop offset="33%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="66%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer faint ring */}
          <circle cx={cx} cy={cy} r={r + 20} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

          {/* Main orbital ring - rotating */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="1.5"
              strokeDasharray="8 12"
            />
          </motion.g>

          {/* Glow ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(79,70,229,0.06)" strokeWidth="50" />

          {/* Connection lines between adjacent agents */}
          {AGENTS.map((agent, i) => {
            const next = AGENTS[(i + 1) % AGENTS.length]
            const rad1 = (agent.angle - 90) * (Math.PI / 180)
            const rad2 = (next.angle - 90) * (Math.PI / 180)
            const x1 = cx + r * Math.cos(rad1)
            const y1 = cy + r * Math.sin(rad1)
            const x2 = cx + r * Math.cos(rad2)
            const y2 = cy + r * Math.sin(rad2)
            return (
              <motion.line
                key={`line-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1.5 + i * 0.1, duration: 0.5 }}
              />
            )
          })}

          {/* Agent nodes */}
          {AGENTS.map((agent, i) => {
            const rad = (agent.angle - 90) * (Math.PI / 180)
            const x = cx + r * Math.cos(rad)
            const y = cy + r * Math.sin(rad)
            return (
              <motion.g
                key={agent.label}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Outer glow */}
                <circle cx={x} cy={y} r="24" fill={agent.glow} opacity="0.15" />
                {/* Mid glow */}
                <circle cx={x} cy={y} r="16" fill={agent.color} opacity="0.12" />
                {/* Core */}
                <circle cx={x} cy={y} r="6" fill={agent.color} opacity="0.9" />
                {/* Inner bright */}
                <circle cx={x} cy={y} r="2.5" fill="white" opacity="0.8" />
                {/* Label */}
                <text
                  x={x}
                  y={y + 32}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.35)"
                  fontSize="9"
                  fontFamily="Inter, sans-serif"
                  fontWeight="500"
                  letterSpacing="0.05em"
                >
                  {agent.label}
                </text>
              </motion.g>
            )
          })}

          {/* Center core */}
          <circle cx={cx} cy={cy} r="22" fill="rgba(79,70,229,0.08)" />
          <circle cx={cx} cy={cy} r="12" fill="rgba(79,70,229,0.2)" />
          <circle cx={cx} cy={cy} r="5" fill="#4F46E5" opacity="0.9" />
          <circle cx={cx} cy={cy} r="2" fill="white" opacity="0.9" />
        </svg>
      </div>
    </div>
  )
}
