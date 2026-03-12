import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import ResultPanel from '../components/dashboard/ResultPanel'
import type { SessionResult } from '../api/types'

export default function VerdictPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [result, setResult] = useState<SessionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        // Try authenticated session endpoint first
        const data = await apiFetch<SessionResult>(`/api/sessions/${sessionId}`)
        if (!cancelled) setResult(data)
      } catch {
        try {
          // Fallback to public share endpoint
          const data = await apiFetch<SessionResult>(`/api/share/${sessionId}`)
          if (!cancelled) setResult(data)
        } catch {
          if (!cancelled) setError('Verdict not found. It may have been removed or the link is invalid.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [sessionId])

  useEffect(() => {
    if (result?.query) {
      document.title = `HERMES Verdict: ${result.query.slice(0, 60)}`
    }
    return () => { document.title = 'HERMES OUROBOROS' }
  }, [result])

  return (
    <div className="min-h-screen bg-[#06060e] relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="orb w-[600px] h-[600px] bg-cyan-600/[0.04] top-0 right-0" />
        <div className="orb w-[500px] h-[500px] bg-violet-600/[0.03] bottom-0 left-0" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.04] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
              H
            </div>
            <span className="text-sm font-bold text-white/60 group-hover:text-white/80 transition-colors">
              OUROBOROS
            </span>
          </Link>
          <Link
            to="/app"
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-white/10 border-t-brand-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-24">
            <p className="text-white/50 text-sm mb-4">{error}</p>
            <Link
              to="/app"
              className="text-brand-400 hover:text-brand-300 text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Query */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Query</p>
              <p className="text-sm text-white/70">{result.query}</p>
            </div>
            <ResultPanel result={result} />
          </div>
        )}
      </main>
    </div>
  )
}
