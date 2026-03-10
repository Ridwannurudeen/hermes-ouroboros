import { Link } from 'react-router-dom'

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/5 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-display font-bold text-white">Hermes Ouroboros</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/30">
            <a href="https://nousresearch.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
              NousResearch
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
              GitHub
            </a>
            <Link to="/app" className="hover:text-white/60 transition-colors">Dashboard</Link>
          </div>

          <p className="text-xs text-white/20">
            Built for the NousResearch Hackathon 2026
          </p>
        </div>
      </div>
    </footer>
  )
}
