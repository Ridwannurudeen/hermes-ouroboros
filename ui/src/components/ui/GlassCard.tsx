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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`
        rounded-[20px] border
        ${glow
          ? 'bg-white/[0.04] border-brand-500/20 shadow-[0_0_40px_rgba(6,182,212,0.12),0_0_80px_rgba(6,182,212,0.04),inset_0_1px_0_rgba(255,255,255,0.05)] '
          : 'bg-white/[0.02] border-white/[0.04] '
        }
        ${hover ? 'shine transition-all duration-400 hover:bg-white/[0.04] hover:border-white/[0.08] hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)] cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
