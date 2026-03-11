import { motion } from 'framer-motion'
import { Infinity } from 'lucide-react'

const CARDS = [
  {
    title: 'Tools Built WITH AI',
    desc: 'A human writes the prompts. A frozen model answers. The system never learns from its own mistakes.',
    dimmed: true,
  },
  {
    title: 'Tools Built BY AI',
    desc: 'Some systems generate code autonomously. But they don\'t evaluate their own reasoning.',
    dimmed: true,
  },
  {
    title: 'A System That Improves Itself',
    desc: 'Hermes Ouroboros generates adversarial debates, identifies which reasoning won, and fine-tunes itself on its own preference data. No human labels.',
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
            Not Another AI Wrapper
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CARDS.map((card, i) => (
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
                {!card.dimmed && (
                  <div className="mb-4 opacity-40">
                    <Infinity size={32} className="text-indigo-400" />
                  </div>
                )}
                <h3 className={`text-lg font-semibold mb-2 tracking-tight ${card.dimmed ? 'text-white/40' : 'text-white/90'}`}>
                  {card.title}
                </h3>
                <p className={`text-sm leading-relaxed ${card.dimmed ? 'text-white/20' : 'text-white/40'}`}>
                  {card.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
