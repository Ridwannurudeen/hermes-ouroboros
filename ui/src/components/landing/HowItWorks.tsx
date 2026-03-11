import { motion } from 'framer-motion'
import { MessageSquare, Users, Scale, Zap } from 'lucide-react'

const STEPS = [
  {
    icon: MessageSquare,
    title: 'Choose Your Mode',
    desc: 'Red Team a startup idea. Verify a viral claim. Research a market thesis. Pick your lens — the agents adapt their entire approach.',
    gradient: 'from-indigo-500 to-blue-500',
    glow: 'rgba(99,102,241,0.15)',
    accent: '#818cf8',
  },
  {
    icon: Users,
    title: 'Two Rounds of Debate',
    desc: 'Round 1: Four agents analyze independently with live web evidence. Round 2: They see each other\'s arguments and write rebuttals. Real adversarial pressure.',
    gradient: 'from-violet-500 to-purple-500',
    glow: 'rgba(139,92,246,0.15)',
    accent: '#a78bfa',
  },
  {
    icon: Scale,
    title: 'HERMES Verdict',
    desc: 'The Arbiter synthesizes everything: a HERMES Score, thinking traps detected, blind spots uncovered, a premortem, and a concrete next action.',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.15)',
    accent: '#34d399',
  },
  {
    icon: Zap,
    title: 'Self-Improvement Loop',
    desc: 'Every disagreement becomes a DPO training pair. The council fine-tunes itself on its own debate data. Zero human labels — autonomous improvement.',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.15)',
    accent: '#fbbf24',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-36 px-6 relative">
      {/* Section glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/[0.03] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="section-label text-indigo-400/60 mb-4">Process</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">How It Works</h2>
          <p className="text-white/30 text-lg max-w-xl mx-auto leading-relaxed">From question to adversarial verdict in four steps.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="group"
            >
              <div className="shine gradient-border p-6 h-full relative">
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${step.glow}, transparent 70%)` }}
                />

                <div className="relative">
                  {/* Step number */}
                  <span className="step-number">{i + 1}</span>

                  {/* Step indicator line */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-lg`} style={{ boxShadow: `0 4px 20px ${step.glow}` }}>
                      <step.icon size={20} className="text-white" />
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                    <span className="text-[10px] font-mono text-white/10 group-hover:text-white/20 transition-colors">0{i + 1}</span>
                  </div>

                  <h3 className="text-lg font-semibold text-white/90 mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed group-hover:text-white/40 transition-colors">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Connecting arrow */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="hidden lg:flex items-center justify-center mt-8 gap-2"
        >
          <div className="h-px flex-1 max-w-xs bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <span className="text-[10px] font-mono text-indigo-400/30 tracking-wider">CONTINUOUS LOOP</span>
          <div className="h-px flex-1 max-w-xs bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </motion.div>
      </div>
    </section>
  )
}
