import { motion } from 'framer-motion'
import { Unlock, Users, Wrench, BookOpen } from 'lucide-react'

const CARDS = [
  {
    title: 'Uncensored Reasoning',
    desc: 'Catches risks other models self-censor. Red-teaming requires brutal honesty.',
    icon: Unlock,
    gradient: 'from-rose-500 to-pink-500',
    glow: 'rgba(244,63,94,0.12)',
    border: 'rgba(244,63,94,0.25)',
    shadow: '0 0 40px rgba(244,63,94,0.15)',
  },
  {
    title: 'Multi-Persona Flexibility',
    desc: 'Five distinct adversarial personalities in one model.',
    icon: Users,
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.25)',
    shadow: '0 0 40px rgba(6,182,212,0.15)',
  },
  {
    title: 'Native Function Calling',
    desc: 'Structured evidence gathering and web search baked in.',
    icon: Wrench,
    gradient: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    shadow: '0 0 40px rgba(245,158,11,0.15)',
  },
  {
    title: 'Long-Context Synthesis',
    desc: 'Arbiter synthesizes across all agents, two rounds, and web evidence.',
    icon: BookOpen,
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    shadow: '0 0 40px rgba(16,185,129,0.15)',
  },
]

export default function HermesAdvantage() {
  return (
    <section id="hermes" className="py-36 px-6 relative">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="section-label text-rose-400/60 mb-4">Why Hermes-3</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">Built Different</h2>
          <p className="text-white/30 text-lg max-w-xl mx-auto leading-relaxed">The only open-weight model purpose-built for adversarial intelligence.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="shine h-full rounded-[20px] p-6 relative overflow-hidden transition-all duration-500"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = card.border
                    e.currentTarget.style.background = card.glow
                    e.currentTarget.style.boxShadow = card.shadow
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center opacity-80`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white/90 tracking-tight">{card.title}</h3>
                  </div>
                  <p className="text-sm text-white/30 leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
