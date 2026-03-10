import { motion } from 'framer-motion'
import { TrendingUp, Brain, Zap } from 'lucide-react'

const RESULTS = [
  {
    icon: Brain,
    title: 'Multi-Perspective Analysis',
    desc: 'Five agents ensure no angle is missed. Conflict detection reveals when the evidence is genuinely split.',
    stat: '5',
    statLabel: 'Agents',
  },
  {
    icon: TrendingUp,
    title: 'Improving Accuracy',
    desc: 'Each DPO training generation shows measurable improvement on benchmark questions.',
    stat: 'Gen 5',
    statLabel: 'Trained',
  },
  {
    icon: Zap,
    title: 'Fully Automated',
    desc: 'From trajectory logging to Modal GPU training to model swap — zero human intervention required.',
    stat: '0',
    statLabel: 'Manual Steps',
  },
]

export default function ResultsSection() {
  return (
    <section id="results" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Why It Works</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Deliberation beats monologue. Self-improvement beats static models.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {RESULTS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8
                hover:bg-white/[0.08] hover:border-white/15 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <item.icon size={24} className="text-brand-400" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{item.stat}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">{item.statLabel}</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
