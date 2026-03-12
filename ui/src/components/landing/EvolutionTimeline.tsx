import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Shield, ArrowRight, ToggleLeft, ToggleRight, Loader2, Search } from 'lucide-react'
import { ScoreGauge } from '../dashboard/ResultPanel'

interface ComparisonResult {
  query: string
  solo: { response: string; elapsed_seconds: number }
  council: {
    arbiter_verdict: string
    hermes_score: number
    confidence_score: number
    verdict_label: string
    elapsed_seconds: number
  }
}

type ViewMode = 'benchmark' | 'live'

export default function EvolutionTimeline() {
  const [benchmarkData, setBenchmarkData] = useState<ComparisonResult[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [showCouncil, setShowCouncil] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('benchmark')
  const [liveQuery, setLiveQuery] = useState('')
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveResult, setLiveResult] = useState<ComparisonResult | null>(null)

  useEffect(() => {
    fetch('/api/benchmark/council-vs-solo')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.results) return
        const mapped: ComparisonResult[] = d.results.slice(0, 5).map((r: any) => ({
          query: r.claim,
          solo: { response: r.solo.response, elapsed_seconds: r.solo.elapsed_seconds },
          council: {
            arbiter_verdict: r.council.verdict_preview || '',
            hermes_score: r.council.quality_score,
            confidence_score: r.council.confidence_score,
            verdict_label: r.council.verdict_label || '',
            elapsed_seconds: r.council.elapsed_seconds,
          },
        }))
        setBenchmarkData(mapped)
      })
      .catch(() => {})
  }, [])

  const runLiveComparison = async () => {
    const q = liveQuery.trim()
    if (!q || liveLoading) return
    setLiveLoading(true)
    setLiveResult(null)
    setShowCouncil(false)

    try {
      const [soloRes, councilRes] = await Promise.all([
        fetch('/api/query/solo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        }),
        fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, analysis_mode: 'verify' }),
        }),
      ])

      if (!soloRes.ok || !councilRes.ok) throw new Error('API error')

      const solo = await soloRes.json()
      const council = await councilRes.json()
      const r = council.result || council

      setLiveResult({
        query: q,
        solo: { response: solo.response, elapsed_seconds: solo.elapsed_seconds },
        council: {
          arbiter_verdict: r.arbiter_verdict || '',
          hermes_score: r.hermes_score || r.confidence_score || 0,
          confidence_score: r.confidence_score || 0,
          verdict_label: r.verdict_sections?.verdict_label || '',
          elapsed_seconds: r.elapsed_seconds || 0,
        },
      })
    } catch {
      // silently fail
    } finally {
      setLiveLoading(false)
    }
  }

  const currentData = viewMode === 'live' && liveResult ? liveResult : benchmarkData[activeIdx]
  if (!benchmarkData.length && viewMode === 'benchmark') return null

  const verdictColor = currentData?.council.verdict_label?.includes('TRUE') || currentData?.council.verdict_label?.includes('STRONG')
    ? 'text-emerald-400' : currentData?.council.verdict_label?.includes('FALSE') || currentData?.council.verdict_label?.includes('FATAL')
    ? 'text-rose-400' : 'text-amber-400'

  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] mb-4">
            <Brain size={11} className="text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80">Head to Head</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Solo Model vs <span className="gradient-text">5-Agent Council</span>
          </h2>
          <p className="text-white/30 text-base max-w-xl mx-auto leading-relaxed">
            Toggle between single-model and adversarial council responses. Same question, different depth.
          </p>
        </motion.div>

        {/* Mode toggle: Benchmark vs Live */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setViewMode('benchmark')}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              viewMode === 'benchmark'
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.04]'
            }`}
          >
            Benchmark Examples
          </button>
          <button
            onClick={() => setViewMode('live')}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              viewMode === 'live'
                ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.04]'
            }`}
          >
            Try Your Own
          </button>
        </div>

        {/* Live query input */}
        {viewMode === 'live' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <Search size={16} className="text-white/20 flex-shrink-0" />
              <input
                type="text"
                value={liveQuery}
                onChange={e => setLiveQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') runLiveComparison() }}
                placeholder="Enter a claim to compare solo vs council..."
                disabled={liveLoading}
                className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
              />
              <button
                onClick={runLiveComparison}
                disabled={!liveQuery.trim() || liveLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-semibold hover:bg-violet-500/30 transition-colors disabled:opacity-40"
              >
                {liveLoading ? <><Loader2 size={14} className="animate-spin" /> Running...</> : <>Compare <ArrowRight size={12} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {currentData && (
          <>
            {/* Query */}
            <div className="text-center mb-6">
              <p className="text-sm text-white/60 italic">"{currentData.query}"</p>
            </div>

            {/* Toggle switch */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className={`text-xs font-semibold transition-colors ${!showCouncil ? 'text-white/60' : 'text-white/20'}`}>
                Solo Hermes-3
              </span>
              <button
                onClick={() => setShowCouncil(!showCouncil)}
                className="relative w-14 h-7 rounded-full border border-white/10 bg-white/[0.04] transition-all hover:bg-white/[0.06]"
              >
                <motion.div
                  className="absolute top-0.5 w-6 h-6 rounded-full"
                  animate={{
                    left: showCouncil ? 'calc(100% - 26px)' : '2px',
                    backgroundColor: showCouncil ? '#6366f1' : '#ffffff30',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={`text-xs font-semibold transition-colors ${showCouncil ? 'text-cyan-400' : 'text-white/20'}`}>
                5-Agent Council
              </span>
            </div>

            {/* Response comparison */}
            <AnimatePresence mode="wait">
              {!showCouncil ? (
                <motion.div
                  key="solo"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={16} className="text-white/20" />
                    <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Solo Model Response</span>
                    <span className="text-[10px] text-white/10 ml-auto font-mono">{currentData.solo.elapsed_seconds?.toFixed(1)}s</span>
                  </div>
                  <p className="text-sm text-white/40 leading-relaxed whitespace-pre-wrap">
                    {currentData.solo.response.slice(0, 600)}{currentData.solo.response.length > 600 ? '...' : ''}
                  </p>
                  <div className="mt-4 text-[10px] text-white/15 uppercase tracking-wider">
                    No structured verdict · No adversarial review · No web evidence
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="council"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/[0.06] rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield size={16} className="text-cyan-400/60" />
                      <span className="text-xs font-bold text-cyan-300/60 uppercase tracking-wider">5-Agent Council Verdict</span>
                      <span className="text-[10px] text-cyan-300/30 ml-auto font-mono">{currentData.council.elapsed_seconds?.toFixed(1)}s</span>
                    </div>

                    <div className="flex items-start gap-5 mb-4">
                      <ScoreGauge score={currentData.council.hermes_score} label="Score" />
                      <div className="flex-1">
                        {currentData.council.verdict_label && (
                          <p className={`text-lg font-black uppercase tracking-wider mb-2 ${verdictColor}`}>
                            {currentData.council.verdict_label}
                          </p>
                        )}
                        <p className="text-sm text-white/50 leading-relaxed">
                          {currentData.council.arbiter_verdict.slice(0, 400)}{currentData.council.arbiter_verdict.length > 400 ? '...' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-cyan-300/30 uppercase tracking-wider">
                      <span>5 agents deliberated</span>
                      <span>·</span>
                      <span>Multi-round debate</span>
                      <span>·</span>
                      <span>Web evidence gathered</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Benchmark navigation */}
            {viewMode === 'benchmark' && benchmarkData.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                {benchmarkData.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveIdx(i); setShowCouncil(false) }}
                    className={`w-2 h-2 rounded-full transition-all ${i === activeIdx ? 'bg-cyan-400 w-5' : 'bg-white/10 hover:bg-white/20'}`}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === 'live' && !liveResult && !liveLoading && (
          <div className="text-center py-12 text-white/20 text-sm">
            Enter a claim above to see solo vs council side by side.
          </div>
        )}
        {liveLoading && (
          <div className="text-center py-12">
            <Loader2 size={24} className="text-cyan-400/50 animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/30">Running both solo and council analysis...</p>
          </div>
        )}
      </div>
    </section>
  )
}
