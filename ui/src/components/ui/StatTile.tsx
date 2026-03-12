import { motion } from 'framer-motion'

interface StatTileProps {
  label: string
  value: string | number
  sub?: string
  delay?: number
}

export default function StatTile({ label, value, sub, delay = 0 }: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[16px] border border-white/[0.04] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 group"
    >
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-medium group-hover:text-white/40 transition-colors">{label}</p>
      <p className="text-xl font-bold mt-1.5 text-white/90 tracking-tight font-display">{value}</p>
      {sub && <p className="text-[11px] text-white/25 mt-0.5">{sub}</p>}
    </motion.div>
  )
}
