import { useState } from 'react'
import { apiFetch } from '../../api/client'
import GlassCard from '../ui/GlassCard'
import { Download, FileText, FileJson, Database, Globe } from 'lucide-react'
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

  const exportHTML = () => {
    if (!currentSession) return
    const s = currentSession
    const vs = s.verdict_sections || {} as Record<string, string>
    const score = s.hermes_score ?? (vs as any).hermes_score ?? s.confidence_score
    const label = (vs as any).verdict_label || 'VERDICT'
    const conf = (vs as any).confidence ?? s.confidence_score
    const ts = new Date(s.timestamp).toLocaleString()

    const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f43f5e'

    const section = (title: string, text: string | undefined) =>
      text ? `<div class="section"><h3>${title}</h3><p>${text.replace(/\n/g, '<br>')}</p></div>` : ''

    const agentCards = Object.entries(s.agent_responses).map(([role, text]) =>
      `<div class="agent"><h4>${role.toUpperCase()}</h4><p>${(text as string).replace(/\n/g, '<br>')}</p></div>`
    ).join('')

    const r2Cards = s.round2_responses ? Object.entries(s.round2_responses).map(([role, text]) =>
      `<div class="agent"><h4>${role.toUpperCase()} (R2)</h4><p>${(text as string).replace(/\n/g, '<br>')}</p></div>`
    ).join('') : ''

    const sourceCards = s.web_evidence ? [
      ...(s.web_evidence.general || []).map((e) => `<a class="source" href="${e.url}" target="_blank"><strong>${e.title}</strong><br><span class="snippet">${e.snippet}</span><span class="badge supporting">Supporting</span></a>`),
      ...(s.web_evidence.counter || []).map((e) => `<a class="source" href="${e.url}" target="_blank"><strong>${e.title}</strong><br><span class="snippet">${e.snippet}</span><span class="badge counter">Counter</span></a>`),
      ...(s.web_evidence.statistical || []).map((e) => `<a class="source" href="${e.url}" target="_blank"><strong>${e.title}</strong><br><span class="snippet">${e.snippet}</span><span class="badge data">Data</span></a>`),
    ].join('') : ''

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HERMES Verdict — ${s.query.slice(0, 60)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a14;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;padding:2rem}
.container{max-width:800px;margin:0 auto}
.header{text-align:center;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid rgba(255,255,255,0.08)}
.header h1{font-size:1.1rem;letter-spacing:0.15em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:0.5rem}
.header .query{font-size:1.3rem;color:#fff;font-weight:600}
.header .meta{font-size:0.75rem;color:rgba(255,255,255,0.3);margin-top:0.5rem}
.hero{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;display:flex;align-items:flex-start;gap:1.5rem}
.score-ring{text-align:center;flex-shrink:0}
.score-ring .num{font-size:2rem;font-weight:800;color:${scoreColor}}
.score-ring .lbl{font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.35)}
.verdict-label{font-size:1.2rem;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:${scoreColor};margin-bottom:0.5rem}
.summary{font-size:0.85rem;color:rgba(255,255,255,0.6)}
.section{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:1rem;margin-bottom:0.75rem}
.section h3{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.45);margin-bottom:0.5rem;font-weight:700}
.section p{font-size:0.8rem;color:rgba(255,255,255,0.55)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem}
.agents-title{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.3);font-weight:700;margin:1.5rem 0 0.75rem}
.agent{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:1rem;margin-bottom:0.5rem}
.agent h4{font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:rgba(6,182,212,0.7);margin-bottom:0.5rem;font-weight:700}
.agent p{font-size:0.75rem;color:rgba(255,255,255,0.5)}
.sources{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:1rem}
.source{display:block;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:0.75rem;text-decoration:none;color:inherit;font-size:0.75rem}
.source strong{color:rgba(255,255,255,0.7);font-size:0.75rem}
.snippet{color:rgba(255,255,255,0.35);font-size:0.65rem;display:block;margin-top:0.25rem}
.badge{display:inline-block;font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:0.35rem;padding:1px 6px;border-radius:4px}
.supporting{background:rgba(16,185,129,0.15);color:#10b981}
.counter{background:rgba(244,63,94,0.15);color:#f43f5e}
.data{background:rgba(139,92,246,0.15);color:#8b5cf6}
.footer{text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.06);font-size:0.7rem;color:rgba(255,255,255,0.2)}
@media print{body{background:#fff;color:#1a1a2e}.hero,.section,.agent,.source{border-color:#e2e8f0}.score-ring .num,.verdict-label{color:${scoreColor}}}
</style></head><body>
<div class="container">
<div class="header">
  <h1>HERMES OUROBOROS</h1>
  <p class="query">${s.query}</p>
  <p class="meta">${ts} · HERMES Score: ${score}/100 · Confidence: ${conf}%</p>
</div>
<div class="hero">
  <div class="score-ring"><div class="num">${score}</div><div class="lbl">HERMES Score</div></div>
  <div><div class="verdict-label">${label}</div><div class="summary">${(s.arbiter_verdict || s.verdict || '').replace(/\n/g, '<br>')}</div></div>
</div>
<div class="grid">
${section('Key Strengths', (vs as any).key_strengths)}
${section('Fatal Flaws', (vs as any).fatal_flaws)}
${section('Evidence For', (vs as any).key_evidence_for)}
${section('Evidence Against', (vs as any).key_evidence_against)}
${section('Bull Case', (vs as any).bull_case_summary)}
${section('Bear Case', (vs as any).bear_case_summary)}
</div>
${section('Fix or Die', (vs as any).fix_or_die)}
${section('Bottom Line', (vs as any).action_items)}
${section('Thinking Traps', (vs as any).thinking_traps)}
${section('Blind Spots', (vs as any).blind_spots)}
<p class="agents-title">${s.round2_responses ? 'Round 1 — Initial Analysis' : 'Agent Responses'}</p>
${agentCards}
${r2Cards ? `<p class="agents-title">Round 2 — Rebuttals</p>${r2Cards}` : ''}
${sourceCards ? `<p class="agents-title">Web Sources</p><div class="sources">${sourceCards}</div>` : ''}
<div class="footer">Generated by HERMES Adversarial Intelligence Engine · hermes-ouroboros.online</div>
</div></body></html>`

    downloadBlob(html, `hermes-verdict-${s.session_id.slice(0, 8)}.html`, 'text/html')
    setStatus('HTML report exported')
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
            <button onClick={exportHTML} className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/15 border border-cyan-500/20 rounded-xl text-sm text-cyan-300 hover:bg-cyan-500/25 transition-colors">
              <Globe size={14} /> HTML Report
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
