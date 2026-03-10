import { motion } from 'framer-motion'
import OuroborosRing from './OuroborosRing'

const FLOW_STEPS = [
  { label: 'Query', desc: 'User submits a question', num: '01' },
  { label: 'Debate', desc: 'Five agents deliberate', num: '02' },
  { label: 'Extract', desc: 'DPO pairs from trajectories', num: '03' },
  { label: 'Train', desc: 'Fine-tune on Modal GPUs', num: '04' },
  { label: 'Deploy', desc: 'Next-gen model goes live', num: '05' },
]

export default function LearningLoop() {
  return (
    <section id="self-improvement" className="py-36 px-6 relative overflow-hidden">
      {/* Section glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/[0.04] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/60 font-medium mb-4">Self-Improvement</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 leading-[1.05]">
              The Ouroboros
              <br />
              <span className="gradient-text">Learning Loop</span>
            </h2>

            <div className="space-y-5 text-white/30 text-base leading-relaxed">
              <p>
                Every query generates training data. DPO preference pairs are extracted from agent debates — where the Arbiter's verdict becomes the <span className="text-white/50">preferred response.</span>
              </p>
              <p>
                When enough trajectories accumulate, the model automatically fine-tunes itself on Modal GPUs. The next generation is <span className="text-white/50">measurably better.</span>
              </p>
            </div>

            {/* Flow steps */}
            <div className="mt-10 space-y-3">
              {FLOW_STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                  className="flex items-center gap-4 group"
                >
                  <span className="text-[11px] font-mono text-white/10 w-6 group-hover:text-indigo-400/40 transition-colors">{step.num}</span>
                  <div className="flex-1 flex items-center gap-3 py-2.5 px-4 rounded-xl border border-white/[0.03] bg-white/[0.01] group-hover:border-white/[0.08] group-hover:bg-white/[0.03] transition-all duration-300">
                    <span className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">{step.label}</span>
                    <span className="text-xs text-white/20">{step.desc}</span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="w-px h-3 bg-white/[0.06] ml-3 hidden lg:block" />
                  )}
                </motion.div>
              ))}
              {/* Loop-back arrow */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="flex items-center gap-4 pl-10"
              >
                <span className="text-[10px] text-indigo-400/30 font-mono tracking-wider">LOOP BACK TO 01</span>
                <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/20 to-transparent" />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <OuroborosRing />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
