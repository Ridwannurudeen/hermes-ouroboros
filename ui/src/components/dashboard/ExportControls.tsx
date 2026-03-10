import { useState } from 'react'
import { apiFetch } from '../../api/client'
import GlassCard from '../ui/GlassCard'
import { Download, FileText, FileJson, Database } from 'lucide-react'
import { useSessionStore } from '../../store/session'

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportControls() {
  const { currentSession } = useSessionStore()
  const [status, setStatus] = useState('')

  const exportMarkdown = async () => {
    if (!currentSession) return
    try {
      const md = await apiFetch<string>(`/api/sessions/${currentSession.session_id}/export`)
      downloadBlob(md, `hermes-${currentSession.session_id.slice(0, 8)}.md`, 'text/markdown')
      setStatus('Markdown exported')
    } catch (e: any) {
      setStatus(e.message)
    }
  }

  const exportJSON = () => {
    if (!currentSession) return
    downloadBlob(JSON.stringify(currentSession, null, 2), `hermes-${currentSession.session_id.slice(0, 8)}.json`, 'application/json')
    setStatus('JSON exported')
  }

  const exportDPO = async () => {
    try {
      const data = await apiFetch<string>('/api/export/dpo')
      downloadBlob(typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'dpo-dataset.jsonl', 'application/jsonl')
      setStatus('DPO dataset exported')
    } catch (e: any) {
      setStatus(e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Download size={18} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Export</h2>
      </div>

      {currentSession ? (
        <GlassCard className="p-5 space-y-3">
          <p className="text-sm text-white/60 line-clamp-1 mb-3">{currentSession.query}</p>
          <div className="flex gap-2">
            <button onClick={exportMarkdown} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors">
              <FileText size={14} /> Markdown
            </button>
            <button onClick={exportJSON} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors">
              <FileJson size={14} /> JSON
            </button>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-white/30">Select a session to export it</p>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Training Data</h3>
        <button onClick={exportDPO} className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/15 text-violet-400 rounded-xl text-sm hover:bg-violet-500/25 transition-colors">
          <Database size={14} /> Export DPO Dataset
        </button>
      </GlassCard>

      {status && <p className="text-xs text-white/40">{status}</p>}
    </div>
  )
}
