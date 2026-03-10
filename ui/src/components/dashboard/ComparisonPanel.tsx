import { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import GlassCard from '../ui/GlassCard'
import { Scale } from 'lucide-react'

interface BenchmarkData {
  html?: string
  generations?: number[]
  [key: string]: unknown
}

export default function ComparisonPanel() {
  const [data, setData] = useState<BenchmarkData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<BenchmarkData>('/api/compare/benchmark')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Scale size={18} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Model Comparison</h2>
      </div>

      {error && (
        <GlassCard className="p-5">
          <p className="text-sm text-white/40">{error}</p>
        </GlassCard>
      )}

      {data && data.html && (
        <GlassCard className="p-5 overflow-x-auto">
          <div className="text-sm text-white/70 [&_table]:w-full [&_td]:p-2 [&_th]:p-2 [&_th]:text-left [&_th]:text-white/50 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_td]:border-t [&_td]:border-white/5"
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        </GlassCard>
      )}

      {!data && !error && (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-white/30">Loading comparison data...</p>
        </GlassCard>
      )}
    </div>
  )
}
