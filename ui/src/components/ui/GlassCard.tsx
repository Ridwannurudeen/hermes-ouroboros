import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  glow?: boolean
  hover?: boolean
  delay?: number
}

export default function GlassCard({ children, className = '', glow, hover, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`
        bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl
        ${glow ? 'ring-2 ring-brand-500/60 shadow-[0_0_30px_rgba(99,102,241,0.25)]' : ''}
        ${hover ? 'transition-all duration-300 hover:bg-white/[0.08] hover:border-white/15' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
