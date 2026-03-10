import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function LandingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-display font-bold text-white text-lg">Ouroboros</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-white/50 hover:text-white/80 transition-colors">How It Works</a>
          <a href="#agents" className="text-sm text-white/50 hover:text-white/80 transition-colors">Agents</a>
          <a href="#loop" className="text-sm text-white/50 hover:text-white/80 transition-colors">Self-Improvement</a>
          <a href="#results" className="text-sm text-white/50 hover:text-white/80 transition-colors">Results</a>
        </div>

        <Link
          to="/app"
          className="px-5 py-2 bg-gradient-to-r from-brand-500 to-violet-500 text-white rounded-xl text-sm font-medium
            hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-300"
        >
          Launch App
        </Link>
      </div>
    </motion.nav>
  )
}
