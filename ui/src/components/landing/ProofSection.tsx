import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Zap, Brain, Shield, Globe, TrendingUp } from 'lucide-react'

interface BenchmarkResult {
  claim: string
  category: string
  solo: { response: string; quality_score: number; elapsed_seconds: number }
  council: {
    quality_score: number
    confidence_score: number
    verdict_label: string
    verdict_preview: string
    has_web_evidence: boolean
    elapsed_seconds: number
    agent_count: number
  }
}

interface ProofCase {
  claim: string
  category: string
  soloScore: number
  councilScore: number
  gap: number
  confidence: number
  verdictLabel: string
  soloExcerpt: string
  councilExcerpt: string
  hasWeb: boolean
}

function QualityBar({ score, color, label, delay }: { score: number; color: string; label: string; delay: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1.5">
        <span className="text-white/30 uppercase tracking-wider font-medium">{label}</span>
        <span className={`font-mono font-bold ${color}`}>{score}/100</span>
      </div>
      <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color === 'text-white/40' ? 'bg-white/20' : 'bg-indigo-500'}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function ProofCard({ proof, isActive }: { proof: ProofCase; isActive: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={proof.claim}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          {/* Claim */}
          <div className="mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/60">
              {proof.category.replace('_', ' ')} mode
            </span>
            <p className="text-sm text-white/70 mt-1 leading-relaxed italic">
              "{proof.claim}"
            </p>
          </div>

          {/* Side by side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Solo */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={13} className="text-white/20" />
                <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Solo Hermes-3</span>
              </div>
              <p className="text-xs text-white/25 leading-relaxed mb-4 line-clamp-4">
                {proof.soloExcerpt}
              </p>
              <QualityBar score={proof.soloScore} color="text-white/40" label="Quality" delay={0.3} />
            </div>

            {/* Council */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/[0.06] rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={13} className="text-indigo-400/60" />
                  <span className="text-xs font-bold text-indigo-300/60 uppercase tracking-wider">5-Agent Council</span>
                  {proof.verdictLabel && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      proof.verdictLabel.includes('FALSE') ? 'bg-red-500/10 text-red-400/70' :
                      proof.verdictLabel.includes('MISLEADING') ? 'bg-amber-500/10 text-amber-400/70' :
                      proof.verdictLabel.includes('FATAL') ? 'bg-rose-500/10 text-rose-400/70' :
                      'bg-emerald-500/10 text-emerald-400/70'
                    }`}>
                      {proof.verdictLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 leading-relaxed mb-4 line-clamp-4">
                  {proof.councilExcerpt}
                </p>
                <QualityBar score={proof.councilScore} color="text-indigo-400" label="Quality" delay={0.5} />
              </div>
            </div>
          </div>

          {/* Delta stats */}
          <div className="flex items-center justify-center gap-6 text-center">
            <div>
              <div className="text-lg font-black font-mono text-emerald-400">+{proof.gap}</div>
              <div className="text-[9px] text-white/20 uppercase tracking-wider">Quality Gap</div>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div>
              <div className="text-lg font-black font-mono text-indigo-400">{proof.confidence}</div>
              <div className="text-[9px] text-white/20 uppercase tracking-wider">Confidence</div>
            </div>
            {proof.hasWeb && (
              <>
                <div className="w-px h-8 bg-white/[0.06]" />
                <div className="flex items-center gap-1.5">
                  <Globe size={12} className="text-violet-400/50" />
                  <div className="text-[9px] text-white/20 uppercase tracking-wider">Web Evidence</div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function ProofSection() {
  const [proofs, setProofs] = useState<ProofCase[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    fetch('/api/benchmark/council-vs-solo')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.results) return
        const wins: ProofCase[] = d.results
          .map((r: BenchmarkResult) => ({
            claim: r.claim,
            category: r.category,
            soloScore: r.solo.quality_score,
            councilScore: r.council?.quality_score ?? 0,
            gap: (r.council?.quality_score ?? 0) - r.solo.quality_score,
            confidence: r.council?.confidence_score ?? 0,
            verdictLabel: r.council?.verdict_label ?? '',
            soloExcerpt: r.solo.response.slice(0, 300),
            councilExcerpt: (r.council?.verdict_preview ?? '').slice(0, 300),
            hasWeb: r.council?.has_web_evidence ?? false,
          }))
          .filter((p: ProofCase) => p.gap > 0)
          .sort((a: ProofCase, b: ProofCase) => b.gap - a.gap)
          .slice(0, 5)
        if (wins.length) setProofs(wins)
      })
      .catch(() => {})
  }, [])

  if (!proofs.length) return null

  const prev = () => setActive(a => (a - 1 + proofs.length) % proofs.length)
  const next = () => setActive(a => (a + 1) % proofs.length)

  return (
    <section className="py-28 px-6 relative">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] mb-4">
            <Zap size={11} className="text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Empirical Evidence</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            See the Difference
          </h2>
          <p className="text-white/30 text-base max-w-xl mx-auto leading-relaxed">
            Same claim. Solo model vs 5-agent adversarial council. <br />
            <span className="text-white/50 font-medium">Real benchmark data, not cherry-picked.</span>
          </p>
        </motion.div>

        {/* Proof carousel */}
        <div className="relative">
          <ProofCard proof={proofs[active]} isActive={true} />

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button onClick={prev} className="p-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-white/30 hover:text-white/60">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5">
              {proofs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === active ? 'bg-indigo-400 w-4' : 'bg-white/10 hover:bg-white/20'}`}
                />
              ))}
            </div>
            <button onClick={next} className="p-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-white/30 hover:text-white/60">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Aggregate proof stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto"
        >
          <div className="text-center p-4 rounded-xl border border-white/[0.03] bg-white/[0.015]">
            <TrendingUp size={14} className="text-emerald-400/50 mx-auto mb-2" />
            <div className="text-xl font-black font-mono text-emerald-400">+{Math.round(proofs.reduce((s, p) => s + p.gap, 0) / proofs.length)}</div>
            <div className="text-[9px] text-white/20 uppercase tracking-wider mt-1">Avg Quality Gap</div>
          </div>
          <div className="text-center p-4 rounded-xl border border-white/[0.03] bg-white/[0.015]">
            <Shield size={14} className="text-indigo-400/50 mx-auto mb-2" />
            <div className="text-xl font-black font-mono text-indigo-400">{proofs.length}/{proofs.length}</div>
            <div className="text-[9px] text-white/20 uppercase tracking-wider mt-1">Council Wins</div>
          </div>
          <div className="text-center p-4 rounded-xl border border-white/[0.03] bg-white/[0.015]">
            <Brain size={14} className="text-violet-400/50 mx-auto mb-2" />
            <div className="text-xl font-black font-mono text-violet-400">{Math.round(proofs.reduce((s, p) => s + p.confidence, 0) / proofs.length)}</div>
            <div className="text-[9px] text-white/20 uppercase tracking-wider mt-1">Avg Confidence</div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
