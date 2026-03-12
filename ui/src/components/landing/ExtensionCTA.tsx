import { motion } from 'framer-motion'
import { Chrome, MousePointerClick, Zap, Globe } from 'lucide-react'

const FEATURES = [
  { icon: MousePointerClick, label: 'Right-click any claim', desc: 'Select text, choose analysis mode' },
  { icon: Zap, label: 'Instant verdicts', desc: '5 agents deliberate in seconds' },
  { icon: Globe, label: 'Works on any page', desc: 'News, social media, research papers' },
]

export default function ExtensionCTA() {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/[0.04] rounded-full pointer-events-none blur-3xl" />

      <div className="max-w-5xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: mockup */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Browser extension popup mockup */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a16] shadow-2xl shadow-indigo-500/5 p-1 max-w-[320px] mx-auto">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.04]">
                <div className="w-2 h-2 rounded-full bg-red-500/30" />
                <div className="w-2 h-2 rounded-full bg-amber-500/30" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                <div className="ml-3 flex-1 h-4 rounded bg-white/[0.04] flex items-center px-2">
                  <span className="text-[8px] text-white/15 font-mono">article.com/climate-claims</span>
                </div>
              </div>

              {/* Context menu mockup */}
              <div className="p-4">
                <p className="text-[10px] text-white/30 leading-relaxed mb-3">
                  ...study claims that <span className="bg-indigo-500/20 text-indigo-300 px-1 rounded">renewable energy now provides 40% of global electricity</span>...
                </p>

                {/* Fake context menu */}
                <div className="rounded-lg border border-white/[0.08] bg-[#12121f] shadow-xl p-1 w-[200px] ml-auto">
                  <div className="px-3 py-1.5 text-[10px] text-white/20">Copy</div>
                  <div className="h-px bg-white/[0.04] my-0.5" />
                  <div className="px-3 py-1.5 text-[10px] text-white/40 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-500/30 flex items-center justify-center text-[7px] text-indigo-300 font-bold">H</span>
                    Verify with Hermes
                  </div>
                  <div className="px-3 py-1.5 text-[10px] text-white/40 flex items-center gap-2 bg-indigo-500/[0.06] rounded">
                    <span className="w-3 h-3 rounded-full bg-rose-500/30 flex items-center justify-center text-[7px] text-rose-300 font-bold">H</span>
                    Red Team with Hermes
                  </div>
                  <div className="px-3 py-1.5 text-[10px] text-white/40 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-violet-500/30 flex items-center justify-center text-[7px] text-violet-300 font-bold">H</span>
                    Research with Hermes
                  </div>
                </div>
              </div>

              {/* Result popup mockup */}
              <div className="mx-4 mb-4 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.03] p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                    <span className="text-sm font-black font-mono text-indigo-400">72</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">MOSTLY TRUE</div>
                    <div className="text-[9px] text-white/30 mt-0.5">While the trend is accurate, the 40%...</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow behind mockup */}
            <div className="absolute -inset-4 bg-indigo-500/[0.04] rounded-2xl -z-10 blur-xl" />
          </motion.div>

          {/* Right: text + CTA */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] mb-6">
              <Chrome size={11} className="text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/80">Chrome Extension</span>
            </div>

            <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 leading-[1.05]">
              Fact-Check
              <br />
              <span className="gradient-text">Any Page</span>
            </h2>

            <p className="text-white/30 text-base leading-relaxed mb-8">
              Select any claim on any webpage. Right-click. Get an adversarial verdict from 5 AI agents — without leaving the page.
            </p>

            {/* Feature pills */}
            <div className="space-y-3 mb-10">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center group-hover:border-indigo-500/20 group-hover:bg-indigo-500/[0.04] transition-all">
                      <Icon size={14} className="text-white/30 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white/60">{f.label}</div>
                      <div className="text-[11px] text-white/20">{f.desc}</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/Ridwannurudeen/hermes-ouroboros/tree/master/extension"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-colors"
              >
                <Chrome size={16} />
                Get Extension
              </a>
              <a
                href="https://github.com/Ridwannurudeen/hermes-ouroboros/tree/master/sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/60 text-sm font-semibold hover:bg-white/[0.04] transition-colors"
              >
                Python SDK
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
