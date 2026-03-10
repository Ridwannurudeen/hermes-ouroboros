import { motion } from 'framer-motion'
import { MessageSquare, Users, Scale, Zap } from 'lucide-react'

const STEPS = [
  {
    icon: MessageSquare,
    title: 'Ask Anything',
    desc: 'Submit a question to the council. Complex, nuanced, controversial — the harder, the better.',
    gradient: 'from-indigo-500 to-blue-500',
    glow: 'rgba(99,102,241,0.15)',
  },
  {
    icon: Users,
    title: 'Agents Deliberate',
    desc: 'Five specialized AI agents — Advocate, Skeptic, Oracle, Contrarian, and Arbiter — debate in parallel.',
    gradient: 'from-violet-500 to-purple-500',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    icon: Scale,
    title: 'Verdict Rendered',
    desc: 'The Arbiter weighs all perspectives, detects conflicts, and delivers a confidence-scored verdict.',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.15)',
  },
  {
    icon: Zap,
    title: 'Self-Improvement',
    desc: 'DPO training pairs are extracted. The model fine-tunes itself. Next generation performs better.',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.15)',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-36 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-400/60 font-medium mb-4">Process</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">How It Works</h2>
          <p className="text-white/30 text-lg max-w-xl mx-auto leading-relaxed">From question to self-improving verdict in four steps.</p>
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
                  <span className="text-[72px] font-display font-bold text-white/[0.02] absolute top-[-16px] right-0 leading-none select-none">
                    {i + 1}
                  </span>

                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-5 opacity-80 group-hover:opacity-100 transition-opacity`}>
                    <step.icon size={20} className="text-white" />
                  </div>

                  <h3 className="text-lg font-semibold text-white/90 mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed group-hover:text-white/40 transition-colors">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
