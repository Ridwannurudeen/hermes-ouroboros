import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../../api/client'

const MEMO_TYPES = [
  { key: 'research_brief', label: 'Research Brief', icon: '\uD83D\uDD2C' },
  { key: 'risk_memo', label: 'Risk Memo', icon: '\u26A0\uFE0F' },
  { key: 'investment_memo', label: 'Investment Memo', icon: '\uD83D\uDCC8' },
] as const

interface MemoExportProps {
  sessionId: string
}

export default function MemoExport({ sessionId }: MemoExportProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleExport = async (memoType: string) => {
    setLoading(memoType)
    try {
      const text = await apiFetch<string>(
        `/api/sessions/${sessionId}/export?format=${memoType}`
      )
      // Create download
      const blob = new Blob([text], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sessionId}_${memoType}.md`
      a.click()
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch {
      // Silently fail
    } finally {
      setLoading(null)
    }
  }

  const handleCopy = async (memoType: string) => {
    setLoading(memoType)
    try {
      const text = await apiFetch<string>(
        `/api/sessions/${sessionId}/export?format=${memoType}`
      )
      await navigator.clipboard.writeText(text)
      setOpen(false)
    } catch {
      // Silently fail
    } finally {
      setLoading(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
          bg-violet-500/10 text-violet-300 border border-violet-500/20
          hover:bg-violet-500/20 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Memo
        <span className="text-white/20">{open ? '\u25B4' : '\u25BE'}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 rounded-lg border border-white/[0.1] bg-[#0c0c1a] shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/[0.06]">
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
              Export as Decision Memo
            </span>
          </div>
          {MEMO_TYPES.map(({ key, label, icon }) => (
            <div
              key={key}
              className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0"
            >
              <span className="text-sm">{icon}</span>
              <span className="text-sm text-white/70 flex-1">{label}</span>
              <button
                onClick={() => handleCopy(key)}
                disabled={loading === key}
                className="text-[10px] px-2 py-1 rounded bg-white/[0.05] text-white/40 hover:text-white/60 hover:bg-white/[0.08] transition-colors"
              >
                {loading === key ? '...' : 'Copy'}
              </button>
              <button
                onClick={() => handleExport(key)}
                disabled={loading === key}
                className="text-[10px] px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
              >
                {loading === key ? '...' : 'Download'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
