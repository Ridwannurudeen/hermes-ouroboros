import { useState, useEffect } from 'react'
import { apiFetch, apiPost, apiDelete } from '../../api/client'
import GlassCard from '../ui/GlassCard'
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react'
import type { ApiKeyInfo } from '../../api/types'

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [label, setLabel] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadKeys = () => {
    apiFetch<ApiKeyInfo[]>('/api/keys').then(setKeys).catch((e) => setError(e.message))
  }

  useEffect(() => { loadKeys() }, [])

  const createKey = async () => {
    try {
      const res = await apiPost<{ api_key: string }>('/api/keys', { label: label || 'My Key' })
      setNewKey(res.api_key)
      setLabel('')
      loadKeys()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const revokeKey = async (keyId: string) => {
    try {
      await apiDelete(`/api/keys/${keyId}`)
      loadKeys()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <Key size={18} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">API Keys</h2>
      </div>

      {/* Create */}
      <GlassCard className="p-5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Key label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50"
          />
          <button onClick={createKey} className="flex items-center gap-2 px-4 py-2.5 bg-brand-500/15 text-brand-400 rounded-xl text-sm hover:bg-brand-500/25 transition-colors">
            <Plus size={14} /> Create
          </button>
        </div>

        {newKey && (
          <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
            <span className="text-xs text-emerald-400 font-mono truncate flex-1">{newKey}</span>
            <button onClick={copyKey} className="p-1 hover:bg-white/10 rounded-lg">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-white/40" />}
            </button>
          </div>
        )}
      </GlassCard>

      {/* List */}
      <div className="space-y-2">
        {keys.map((k) => (
          <GlassCard key={k.key_id} hover className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">{k.label}</p>
              <p className="text-[11px] text-white/30 font-mono">{k.prefix}...</p>
            </div>
            <button onClick={() => revokeKey(k.key_id)} className="p-2 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          </GlassCard>
        ))}
      </div>

      {error && <p className="text-xs text-rose-400/60">{error}</p>}
    </div>
  )
}
