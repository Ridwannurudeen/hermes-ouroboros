import { useState } from 'react'
import { apiPost, apiDelete } from '../../api/client'
import GlassCard from '../ui/GlassCard'
import { Share2, Link2, Copy, Trash2, Check } from 'lucide-react'
import { useSessionStore } from '../../store/session'

export default function ShareControls() {
  const { currentSession, setCurrentSession } = useSessionStore()
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')

  if (!currentSession) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Share2 size={18} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Share</h2>
        </div>
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-white/30">Select a session to share it</p>
        </GlassCard>
      </div>
    )
  }

  const shareUrl = currentSession.share_id
    ? `${window.location.origin}/share/${currentSession.share_id}`
    : null

  const createShare = async () => {
    try {
      const res = await apiPost<{ share_id: string }>(`/api/sessions/${currentSession.session_id}/share`, {})
      setCurrentSession({ ...currentSession, share_id: res.share_id })
      setStatus('Share link created')
    } catch (e: any) {
      setStatus(e.message)
    }
  }

  const revokeShare = async () => {
    try {
      await apiDelete(`/api/sessions/${currentSession.session_id}/share`)
      setCurrentSession({ ...currentSession, share_id: null })
      setStatus('Share link revoked')
    } catch (e: any) {
      setStatus(e.message)
    }
  }

  const copyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Share2 size={18} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Share</h2>
      </div>

      <GlassCard className="p-5">
        <p className="text-sm text-white/60 mb-3 line-clamp-1">{currentSession.query}</p>

        {shareUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
              <Link2 size={14} className="text-brand-400 flex-shrink-0" />
              <span className="text-xs text-white/60 font-mono truncate flex-1">{shareUrl}</span>
              <button onClick={copyLink} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-white/40" />}
              </button>
            </div>
            <button onClick={revokeShare} className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-xs hover:bg-rose-500/20 transition-colors">
              <Trash2 size={12} /> Revoke Link
            </button>
          </div>
        ) : (
          <button onClick={createShare} className="flex items-center gap-2 px-4 py-2.5 bg-brand-500/15 text-brand-400 rounded-xl text-sm hover:bg-brand-500/25 transition-colors">
            <Share2 size={14} /> Create Share Link
          </button>
        )}

        {status && <p className="text-xs text-white/40 mt-2">{status}</p>}
      </GlassCard>
    </div>
  )
}
