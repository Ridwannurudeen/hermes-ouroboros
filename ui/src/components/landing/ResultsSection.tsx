import { motion } from 'framer-motion'
import { Brain, TrendingUp, Zap } from 'lucide-react'

const RESULTS = [
  {
    icon: Brain,
    title: 'Multi-Perspective Analysis',
    desc: 'Five agents ensure no angle is missed. Conflict detection reveals when the evidence is genuinely split.',
    stat: '5',
    statLabel: 'Agents',
    gradient: 'from-indigo-500 to-violet-500',
    glow: 'rgba(99,102,241,0.1)',
  },
  {
    icon: TrendingUp,
    title: 'Improving Accuracy',
    desc: 'Each DPO training generation shows measurable improvement on benchmark questions.',
    stat: 'Gen 5',
    statLabel: 'Trained',
    gradient: 'from-violet-500 to-purple-500',
    glow: 'rgba(139,92,246,0.1)',
  },
  {
    icon: Zap,
    title: 'Fully Automated',
    desc: 'From trajectory logging to Modal GPU training to model swap — zero human intervention.',
    stat: '0',
    statLabel: 'Manual Steps',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.1)',
  },
]

export default function ResultsSection() {
  return (
    <section id="results" className="py-36 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/60 font-medium mb-4">Impact</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">Why It Works</h2>
          <p className="text-white/30 text-lg max-w-xl mx-auto leading-relaxed">Deliberation beats monologue. Self-improvement beats static models.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {RESULTS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="group"
            >
              <div className="shine gradient-border p-8 h-full relative">
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 30%, ${item.glow}, transparent 70%)` }}
                />

                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity`}>
                      <item.icon size={22} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white/90 font-display">{item.stat}</p>
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.15em]">{item.statLabel}</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-3 tracking-tight">{item.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed group-hover:text-white/40 transition-colors">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
