import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Brain, TrendingUp, Zap, ArrowRight } from 'lucide-react'

function AnimatedNumber({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState('0')
  const numericValue = typeof value === 'number' ? value : parseInt(value.replace(/\D/g, ''), 10)

  useEffect(() => {
    if (!isInView || isNaN(numericValue)) {
      if (isInView) setDisplay(String(value))
      return
    }
    let start = 0
    const duration = 1200
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      start = Math.round(eased * numericValue)
      setDisplay(String(start))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, numericValue, value])

  return <span ref={ref}>{display}{suffix}</span>
}

const RESULTS = [
  {
    icon: Brain,
    title: '5 Competing Epistemic Frameworks',
    desc: 'Five agents with incompatible worldviews ensure no angle is missed. Conflict detection reveals when the evidence is genuinely split.',
    stat: 5,
    statLabel: 'Frameworks',
    gradient: 'from-cyan-500 to-violet-500',
    glow: 'rgba(6,182,212,0.1)',
  },
  {
    icon: TrendingUp,
    title: '35% Sharper After Self-Training',
    desc: '665+ self-generated lessons across 5 DPO cycles. Every disagreement becomes training data. The council teaches itself.',
    stat: 35,
    statSuffix: '%',
    statLabel: 'Improvement',
    gradient: 'from-violet-500 to-purple-500',
    glow: 'rgba(139,92,246,0.1)',
  },
  {
    icon: Zap,
    title: 'Zero Human Labels Required',
    desc: 'No annotators. No manual curation. The system generates adversarial debates, identifies winners, and fine-tunes itself on its own preference data.',
    stat: 0,
    statLabel: 'Human Labels',
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
          <p className="section-label text-emerald-400/60 mb-4">Impact</p>
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
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity`} style={{ boxShadow: `0 4px 20px ${item.glow}` }}>
                      <item.icon size={22} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white/90 font-display">
                        {(item as Record<string,unknown>).statPrefix as string || ''}<AnimatedNumber value={item.stat} suffix={(item as Record<string,unknown>).statSuffix as string || ''} />
                      </p>
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

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-24 text-center"
        >
          <h3 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Ask Your Hardest Question.
          </h3>
          <p className="text-white/30 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Every query makes the council sharper. Every debate generates training signal. This is not a static model — it is a system that rewrites its own reasoning.
          </p>
          <Link
            to="/app"
            className="group btn-glow inline-flex items-center gap-2.5 px-8 py-4 text-white rounded-2xl text-base font-semibold tracking-wide"
          >
            Try It Free
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
