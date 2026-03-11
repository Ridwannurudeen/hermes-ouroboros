import { motion } from 'framer-motion'
import { Shield, Search, BarChart3, RefreshCw, Scale } from 'lucide-react'

const AGENTS = [
  {
    name: 'Advocate',
    icon: Shield,
    gradient: 'from-indigo-500 to-blue-500',
    glow: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.25)',
    shadow: '0 0 40px rgba(99,102,241,0.15)',
    desc: 'In Red Team mode: finds genuine strengths. In Verify: builds the case it\'s true. In Research: the bull case.',
    role: 'Builds the case',
    wide: true,
  },
  {
    name: 'Skeptic',
    icon: Search,
    gradient: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    shadow: '0 0 40px rgba(245,158,11,0.15)',
    desc: 'In Red Team mode: finds the fatal flaw. In Verify: builds the case it\'s false. In Research: the bear case.',
    role: 'Finds the flaws',
  },
  {
    name: 'Oracle',
    icon: BarChart3,
    gradient: 'from-violet-500 to-purple-500',
    glow: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.25)',
    shadow: '0 0 40px rgba(139,92,246,0.15)',
    desc: 'Pure data. Base rates, comparable cases, source credibility. No opinions — just what the evidence says.',
    role: 'Grounds in data',
  },
  {
    name: 'Contrarian',
    icon: RefreshCw,
    gradient: 'from-rose-500 to-pink-500',
    glow: 'rgba(244,63,94,0.12)',
    border: 'rgba(244,63,94,0.25)',
    shadow: '0 0 40px rgba(244,63,94,0.15)',
    desc: 'Finds what everyone is missing — the blind spot the creator can\'t see from their vantage point.',
    role: 'Uncovers blind spots',
  },
  {
    name: 'Arbiter',
    icon: Scale,
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    shadow: '0 0 40px rgba(16,185,129,0.15)',
    desc: 'Synthesizes all perspectives into a HERMES Score, detects thinking traps, writes a premortem, and delivers actionable next steps.',
    role: 'Delivers the verdict',
    wide: true,
  },
]

export default function AgentShowcase() {
  return (
    <section id="agents" className="py-36 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="section-label text-violet-400/60 mb-4">Architecture</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">The Council</h2>
          <p className="text-white/30 text-lg max-w-xl mx-auto leading-relaxed">Five specialized agents, each with a distinct perspective. Together, they see what one cannot.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`group ${agent.wide ? 'md:col-span-2' : ''}`}
            >
              <div
                className="shine h-full rounded-[20px] p-6 relative overflow-hidden transition-all duration-500"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = agent.border
                  e.currentTarget.style.background = agent.glow
                  e.currentTarget.style.boxShadow = agent.shadow
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div className="flex items-center gap-3.5 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300`}>
                    <agent.icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white/90 tracking-tight">{agent.name}</h3>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/15 group-hover:text-white/25 transition-colors">{agent.role}</p>
                  </div>
                </div>
                <p className="text-sm text-white/30 leading-relaxed group-hover:text-white/45 transition-colors duration-300">{agent.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
