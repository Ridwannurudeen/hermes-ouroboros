import { useState } from 'react'
import { Code, Copy, Check, Key, Shield } from 'lucide-react'
import GlassCard from '../ui/GlassCard'

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/query',
    desc: 'Synchronous analysis — full council deliberation',
    request: `{
  "query": "Is Bitcoin a good investment?",
  "mode": "default",
  "analysis_mode": "red_team"
}`,
    response: `{
  "session_id": "abc-123",
  "arbiter_verdict": "...",
  "confidence_score": 72,
  "hermes_score": 68,
  "verdict_sections": { ... },
  "agent_responses": { ... }
}`,
    curl: `curl -X POST https://hermes-ouroboros.online/api/query \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_key_here" \\
  -d '{"query":"Is Bitcoin a good investment?","analysis_mode":"red_team"}'`,
  },
  {
    method: 'POST',
    path: '/api/query/stream',
    desc: 'SSE streaming — real-time agent tokens + final result',
    request: `{
  "query": "Remote workers are more productive",
  "mode": "default",
  "analysis_mode": "verify"
}`,
    response: `data: {"type":"agent_token","role":"advocate","token":"The"}
data: {"type":"agent_complete","role":"advocate","duration_seconds":3.2}
data: {"type":"final","result":{...},"runtime":{...}}`,
    curl: `curl -N -X POST https://hermes-ouroboros.online/api/query/stream \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_key_here" \\
  -d '{"query":"Remote workers are more productive","analysis_mode":"verify"}'`,
  },
  {
    method: 'POST',
    path: '/api/query/solo',
    desc: 'Single model query — no council, direct Hermes response',
    request: `{
  "query": "Explain quantum computing"
}`,
    response: `{
  "response": "Quantum computing leverages...",
  "elapsed_seconds": 2.1
}`,
    curl: `curl -X POST https://hermes-ouroboros.online/api/query/solo \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_key_here" \\
  -d '{"query":"Explain quantum computing"}'`,
  },
]

const MODES = [
  { mode: 'red_team', desc: 'Stress-test ideas for fatal flaws, blind spots, and survival probability' },
  { mode: 'verify', desc: 'Fact-check claims with evidence for/against and source credibility' },
  { mode: 'research', desc: 'Deep-dive analysis with bull/bear cases and key uncertainties' },
  { mode: 'default', desc: 'General council deliberation across all perspectives' },
]

const RATE_LIMITS = [
  { tier: 'Guest', limit: '5 queries/day', note: 'No auth required' },
  { tier: 'API Key', limit: '100 queries/day', note: 'X-API-Key header' },
  { tier: 'Authenticated', limit: '500 queries/day', note: 'Session cookie' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="text-white/20 hover:text-white/50 transition-colors p-1">
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  )
}

export default function ApiPlayground() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Code size={20} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">API Reference</h2>
          <p className="text-xs text-white/30">Production-ready REST API for adversarial intelligence</p>
        </div>
      </div>

      {/* Auth section */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Key size={14} className="text-amber-400" />
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Authentication</h3>
        </div>
        <p className="text-xs text-white/40 mb-3">Include your API key in the request header:</p>
        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
          <code className="text-xs text-indigo-300 font-mono flex-1">X-API-Key: your_api_key_here</code>
          <CopyButton text="X-API-Key: your_api_key_here" />
        </div>
        <p className="text-[11px] text-white/25 mt-2">
          Generate keys in the <span className="text-indigo-400">API Keys</span> panel. Guest access available without auth (rate-limited).
        </p>
      </GlassCard>

      {/* Endpoints */}
      {ENDPOINTS.map((ep) => (
        <GlassCard key={ep.path} className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
              {ep.method}
            </span>
            <code className="text-sm font-mono text-white/70">{ep.path}</code>
          </div>
          <p className="text-xs text-white/40">{ep.desc}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Request Body</p>
              <pre className="bg-black/30 rounded-lg p-3 text-[11px] font-mono text-indigo-300/70 overflow-x-auto leading-relaxed">{ep.request}</pre>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Response</p>
              <pre className="bg-black/30 rounded-lg p-3 text-[11px] font-mono text-emerald-300/70 overflow-x-auto leading-relaxed">{ep.response}</pre>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">cURL</p>
              <CopyButton text={ep.curl} />
            </div>
            <pre className="bg-black/30 rounded-lg p-3 text-[11px] font-mono text-amber-300/60 overflow-x-auto leading-relaxed whitespace-pre-wrap">{ep.curl}</pre>
          </div>
        </GlassCard>
      ))}

      {/* Modes */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-violet-400" />
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Analysis Modes</h3>
        </div>
        <div className="space-y-2">
          {MODES.map((m) => (
            <div key={m.mode} className="flex items-start gap-3 py-1.5">
              <code className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded flex-shrink-0">{m.mode}</code>
              <p className="text-xs text-white/40">{m.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Rate limits */}
      <GlassCard className="p-5">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Rate Limits</h3>
        <div className="space-y-2">
          {RATE_LIMITS.map((r) => (
            <div key={r.tier} className="flex items-center gap-4 py-1">
              <span className="text-xs font-semibold text-white/50 w-24">{r.tier}</span>
              <span className="text-xs font-mono text-white/60">{r.limit}</span>
              <span className="text-[10px] text-white/25">{r.note}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
