import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function LandingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#06060e]/95"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 opacity-80" />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 blur-lg opacity-40" />
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
          </div>
          <span className="font-display font-bold text-white/90 text-lg tracking-tight">Ouroboros</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {['How It Works', 'Agents', 'Self-Improvement', 'Results'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-[13px] text-white/30 hover:text-white/70 transition-colors duration-300 tracking-wide"
            >
              {item}
            </a>
          ))}
        </div>

        <Link
          to="/app"
          className="btn-glow px-5 py-2 text-white rounded-xl text-sm font-semibold tracking-wide"
        >
          Launch App
        </Link>
      </div>
    </motion.nav>
  )
}
