import { motion } from 'framer-motion'
import { Shield, Search, BarChart3, RefreshCw, Scale } from 'lucide-react'

const AGENTS = [
  {
    name: 'Advocate',
    icon: Shield,
    color: 'indigo',
    gradient: 'from-indigo-500 to-blue-500',
    desc: 'Builds the strongest possible case. Finds evidence, constructs arguments, steelmans the position.',
    span: 'col-span-1 row-span-1 md:col-span-2',
  },
  {
    name: 'Skeptic',
    icon: Search,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    desc: 'Tears arguments apart. Finds logical fallacies, weak evidence, and hidden assumptions.',
    span: 'col-span-1',
  },
  {
    name: 'Oracle',
    icon: BarChart3,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
    desc: 'Data only. No opinions. Provides raw evidence, statistics, and sourced facts.',
    span: 'col-span-1',
  },
  {
    name: 'Contrarian',
    icon: RefreshCw,
    color: 'rose',
    gradient: 'from-rose-500 to-pink-500',
    desc: 'Challenges the majority. If everyone agrees, the Contrarian dissents.',
    span: 'col-span-1',
  },
  {
    name: 'Arbiter',
    icon: Scale,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    desc: 'The final word. Weighs all evidence, detects conflict, delivers the verdict with a confidence score.',
    span: 'col-span-1 md:col-span-2',
  },
]

export default function AgentShowcase() {
  return (
    <section id="agents" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">The Council</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Five specialized agents, each with a distinct perspective. Together, they see what one cannot.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group ${agent.span}`}
            >
              <div className="h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6
                group-hover:bg-white/[0.08] group-hover:border-white/15 transition-all duration-300
                group-hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center opacity-90`}>
                    <agent.icon size={20} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                </div>
                <p className="text-sm text-white/40 leading-relaxed">{agent.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
