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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white/5 border border-white/10 rounded-xl p-4"
    >
      <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1 text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
    </motion.div>
  )
}
