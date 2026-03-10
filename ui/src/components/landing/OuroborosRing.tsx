import { motion } from 'framer-motion'

const AGENTS = [
  { label: 'Advocate', angle: 0, color: '#818cf8' },
  { label: 'Skeptic', angle: 72, color: '#f59e0b' },
  { label: 'Oracle', angle: 144, color: '#8b5cf6' },
  { label: 'Contrarian', angle: 216, color: '#f43f5e' },
  { label: 'Arbiter', angle: 288, color: '#10b981' },
]

export default function OuroborosRing() {
  const cx = 200
  const cy = 200
  const r = 140

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 400 400" className="w-64 h-64 md:w-80 md:h-80">
        {/* Rotating ring */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="2"
          strokeDasharray="12 8"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Glow ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(79, 70, 229, 0.15)" strokeWidth="40" />

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
              transition={{ delay: 0.8 + i * 0.15, duration: 0.5 }}
            >
              {/* Glow */}
              <circle cx={x} cy={y} r="20" fill={agent.color} opacity="0.15" />
              {/* Node */}
              <circle cx={x} cy={y} r="10" fill={agent.color} opacity="0.9" />
              {/* Label */}
              <text
                x={x}
                y={y + 28}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize="10"
                fontFamily="Inter, sans-serif"
                fontWeight="500"
              >
                {agent.label}
              </text>
            </motion.g>
          )
        })}

        {/* Center */}
        <motion.circle
          cx={cx}
          cy={cy}
          r="18"
          fill="rgba(79, 70, 229, 0.3)"
          animate={{ r: [18, 22, 18] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={cx} cy={cy} r="8" fill="#4F46E5" />

        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
