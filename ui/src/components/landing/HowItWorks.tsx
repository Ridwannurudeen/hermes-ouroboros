import { motion } from 'framer-motion'
import { MessageSquare, Users, Scale, Zap } from 'lucide-react'

const STEPS = [
  {
    icon: MessageSquare,
    title: 'Ask Anything',
    desc: 'Submit a question to the council. Complex, nuanced, controversial — the harder, the better.',
    color: 'from-brand-500 to-indigo-500',
  },
  {
    icon: Users,
    title: 'Agents Deliberate',
    desc: 'Five specialized AI agents — Advocate, Skeptic, Oracle, Contrarian, and Arbiter — debate in parallel.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Scale,
    title: 'Verdict Rendered',
    desc: 'The Arbiter weighs all perspectives, detects conflicts, and delivers a confidence-scored verdict.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Zap,
    title: 'Self-Improvement',
    desc: 'DPO training pairs are extracted. The model fine-tunes itself. Next generation performs better.',
    color: 'from-amber-500 to-orange-500',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">From question to self-improving verdict in four steps.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative group"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full
                group-hover:bg-white/[0.08] group-hover:border-white/15 transition-all duration-300">
                {/* Number */}
                <span className="text-[80px] font-display font-bold text-white/[0.03] absolute top-2 right-4 leading-none">
                  {i + 1}
                </span>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 opacity-90`}>
                  <step.icon size={22} className="text-white" />
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
