import { motion } from 'framer-motion'
import { Shield, Brain, Zap } from 'lucide-react'

const CARDS = [
  {
    icon: Shield,
    title: 'Not a Chatbot',
    desc: 'Chatbots give you one opinion. HERMES gives you five adversarial perspectives, finds the blind spots, and delivers a stress-tested verdict.',
    dimmed: true,
  },
  {
    icon: Brain,
    title: 'Not a Search Engine',
    desc: 'Search gives you links. HERMES gathers web evidence, then has four specialized agents argue over what it actually means.',
    dimmed: true,
  },
  {
    icon: Zap,
    title: 'An Adversarial Intelligence Engine',
    desc: 'Red team your startup. Fact-check a viral claim. Research a market thesis. Five agents debate in two rounds, detect thinking traps, and deliver a HERMES Score with actionable next steps.',
    dimmed: false,
  },
]

export default function DifferentiatorSection() {
  return (
    <section className="py-36 px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/[0.02] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="section-label text-violet-400/60 mb-4">Why This Is Different</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-5">
            Five Agents. Two Rounds. One Verdict.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CARDS.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="group"
              >
                <div
                  className={`shine p-6 h-full relative rounded-[20px] border transition-all duration-500 ${
                    card.dimmed
                      ? 'bg-white/[0.01] border-white/[0.03] opacity-50'
                      : 'bg-white/[0.04] border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.08)]'
                  }`}
                  style={!card.dimmed ? { borderLeftWidth: 3, borderLeftColor: 'rgba(99,102,241,0.4)' } : {}}
                >
                  <div className="mb-4 opacity-40">
                    <Icon size={32} className={card.dimmed ? 'text-white/30' : 'text-indigo-400'} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 tracking-tight ${card.dimmed ? 'text-white/40' : 'text-white/90'}`}>
                    {card.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${card.dimmed ? 'text-white/20' : 'text-white/40'}`}>
                    {card.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
