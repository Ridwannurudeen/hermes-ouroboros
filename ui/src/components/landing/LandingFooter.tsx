import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.04] py-20 px-6 relative">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-indigo-500/[0.03] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center opacity-70 shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <span className="font-display font-bold text-white/50 tracking-tight">HERMES — Adversarial Intelligence Engine</span>
          </div>

          <div className="flex items-center gap-8 text-[13px] text-white/20">
            <a href="https://nousresearch.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors duration-300 flex items-center gap-1">
              NousResearch <ArrowUpRight size={10} className="opacity-50" />
            </a>
            <a href="https://github.com/Ridwannurudeen/hermes-ouroboros" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors duration-300 flex items-center gap-1">
              GitHub <ArrowUpRight size={10} className="opacity-50" />
            </a>
            <Link to="/app" className="hover:text-white/50 transition-colors duration-300">Dashboard</Link>
          </div>

          <p className="text-[11px] text-white/10 tracking-wide">
            Built for the NousResearch Hackathon 2026
          </p>
        </div>
      </div>
    </footer>
  )
}
