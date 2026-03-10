import { motion } from 'framer-motion'
import OuroborosRing from './OuroborosRing'

export default function LearningLoop() {
  return (
    <section id="loop" className="py-32 px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
              The Ouroboros
              <br />
              <span className="gradient-text">Learning Loop</span>
            </h2>
            <div className="space-y-4 text-white/40">
              <p className="text-lg leading-relaxed">
                Every query generates training data. DPO preference pairs are extracted from agent debates — where the Arbiter's verdict becomes the preferred response.
              </p>
              <p className="leading-relaxed">
                When enough trajectories accumulate, the model automatically fine-tunes itself on Modal GPUs. The next generation is measurably better.
              </p>
              <p className="leading-relaxed">
                This is the ouroboros — the serpent eating its own tail. The system improves by consuming its own output.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { label: 'Query', value: 'Input' },
                { label: 'Debate', value: 'Process' },
                { label: 'Train', value: 'Improve' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
                >
                  <p className="text-xs text-white/30 uppercase tracking-wider">{item.value}</p>
                  <p className="text-sm font-semibold text-white mt-1">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <OuroborosRing />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
