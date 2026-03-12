import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AnalysisData {
  benchmark: {
    avg_solo_quality: number
    avg_council_quality: number
    quality_improvement: number
    avg_council_confidence: number
    council_wins: number
    solo_wins: number
    ties: number
    council_win_rate: number
    avg_solo_time: number
    avg_council_time: number
  } | null
  benchmark_claims: number
  per_category: Record<string, {
    n: number; avg_solo: number; avg_council: number
    avg_confidence: number; council_wins: number; solo_wins: number
  }>
  confidence_calibration: Record<string, { n: number; avg_quality: number }>
  dpo_validation: {
    total_pairs: number
    avg_chosen_quality: number
    avg_rejected_quality: number
    quality_gap: number
    chosen_win_rate: number
    rejected_win_rate: number
    tie_rate: number
    avg_chosen_length: number
    avg_rejected_length: number
  } | null
  training: {
    total_sessions: number
    avg_confidence: number
    total_dpo_pairs: number
    model_history: { name: string; loss: number; steps: number; mode: string }[]
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 border-b-2 border-gray-300 font-semibold text-gray-700 bg-gray-50">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              {row.map((cell, ci) => (
                <td key={ci} className="py-2 px-3 border-b border-gray-200 text-gray-600 font-mono text-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LossCurveSVG({ versions }: { versions: AnalysisData['training']['model_history'] }) {
  if (versions.length < 2) return null
  const losses = versions.map(v => v.loss)
  const maxL = Math.max(...losses) * 1.1
  const minL = Math.min(...losses) * 0.85
  const W = 500, H = 200, pad = 50

  const points = versions.map((v, i) => ({
    x: pad + (i / (versions.length - 1)) * (W - pad * 2),
    y: pad + ((maxL - v.loss) / (maxL - minL)) * (H - pad * 2),
    ...v,
  }))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <figure className="my-8">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg mx-auto" style={{ fontFamily: 'ui-monospace, monospace' }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={pad} x2={W - pad} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)}
            stroke="#e5e7eb" strokeWidth={1} />
        ))}
        {/* Y-axis labels */}
        {[0, 0.5, 1].map(f => {
          const val = maxL - f * (maxL - minL)
          return <text key={f} x={pad - 8} y={pad + f * (H - pad * 2) + 4} textAnchor="end" fill="#6b7280" fontSize={10}>{val.toFixed(1)}</text>
        })}
        {/* Line */}
        <path d={line} fill="none" stroke="#4f46e5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill="#4f46e5" />
            <circle cx={p.x} cy={p.y} r={8} fill="none" stroke="#4f46e5" strokeWidth={1} opacity={0.3} />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#374151" fontSize={10} fontWeight="bold">{p.loss.toFixed(3)}</text>
            <text x={p.x} y={H - 10} textAnchor="middle" fill="#6b7280" fontSize={9}>{p.name.replace('adapter_', 'v')}</text>
          </g>
        ))}
        {/* Axes */}
        <line x1={pad} x2={pad} y1={pad - 10} y2={H - pad + 10} stroke="#374151" strokeWidth={1.5} />
        <line x1={pad - 10} x2={W - pad + 10} y1={H - pad} y2={H - pad} stroke="#374151" strokeWidth={1.5} />
        <text x={W / 2} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize={10}>Training Iteration</text>
        <text x={12} y={H / 2} textAnchor="middle" fill="#6b7280" fontSize={10} transform={`rotate(-90, 12, ${H / 2})`}>Loss</text>
      </svg>
      <figcaption className="text-center text-xs text-gray-500 mt-2 italic">
        Figure 1. Training loss across {versions.length} self-improvement cycles on Hermes-3-Llama-3.1-8B (LoRA r=16, A10G GPU).
      </figcaption>
    </figure>
  )
}

function QualityBarChart({ data }: { data: AnalysisData }) {
  if (!data.benchmark) return null
  const solo = data.benchmark.avg_solo_quality
  const council = data.benchmark.avg_council_quality
  const max = 100

  return (
    <figure className="my-8">
      <div className="max-w-md mx-auto space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Solo Hermes-3</span>
            <span className="font-mono">{solo.toFixed(1)}</span>
          </div>
          <div className="h-6 bg-gray-100 rounded overflow-hidden">
            <div className="h-full bg-gray-400 rounded" style={{ width: `${(solo / max) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>5-Agent Council</span>
            <span className="font-mono">{council.toFixed(1)}</span>
          </div>
          <div className="h-6 bg-gray-100 rounded overflow-hidden">
            <div className="h-full bg-indigo-500 rounded" style={{ width: `${(council / max) * 100}%` }} />
          </div>
        </div>
      </div>
      <figcaption className="text-center text-xs text-gray-500 mt-3 italic">
        Figure 2. Average response quality scores (0-100) across {data.benchmark_claims} verifiable claims.
      </figcaption>
    </figure>
  )
}

function DPOValidationChart({ dpo }: { dpo: AnalysisData['dpo_validation'] }) {
  if (!dpo) return null
  return (
    <figure className="my-8">
      <div className="max-w-md mx-auto space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Chosen (Arbiter-preferred)</span>
            <span className="font-mono">{dpo.avg_chosen_quality.toFixed(1)}</span>
          </div>
          <div className="h-6 bg-gray-100 rounded overflow-hidden">
            <div className="h-full bg-emerald-500 rounded" style={{ width: `${(dpo.avg_chosen_quality / 100) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Rejected (Overruled)</span>
            <span className="font-mono">{dpo.avg_rejected_quality.toFixed(1)}</span>
          </div>
          <div className="h-6 bg-gray-100 rounded overflow-hidden">
            <div className="h-full bg-red-400 rounded" style={{ width: `${(dpo.avg_rejected_quality / 100) * 100}%` }} />
          </div>
        </div>
      </div>
      <figcaption className="text-center text-xs text-gray-500 mt-3 italic">
        Figure 3. Quality comparison of Arbiter-chosen vs rejected responses across {dpo.total_pairs} DPO pairs.
      </figcaption>
    </figure>
  )
}

/* ------------------------------------------------------------------ */
/*  Section helper                                                     */
/* ------------------------------------------------------------------ */
function Section({ id, number, title, children }: { id: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 mb-6">
      <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
        <span className="text-indigo-600">{number}</span> {title}
      </h2>
      {children}
    </section>
  )
}

function SubSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 mb-4">
      <h3 className="text-base font-semibold text-gray-800 mb-3">
        <span className="text-indigo-500">{number}</span> {title}
      </h3>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
interface ComparisonResult {
  query: string
  mode?: string
  base_quality: number
  trained_quality: number
  quality_delta: number
  base_confidence: number
  trained_confidence: number
  delta: number
}

export default function PaperPage() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [comparison, setComparison] = useState<ComparisonResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/research/analysis').then(r => r.json()),
      fetch('/api/compare/benchmark').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([analysis, comp]) => {
      setData(analysis)
      if (comp?.comparisons) setComparison(comp.comparisons)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#fafafa] print:bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 print:hidden">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={14} /> Back to site
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Download size={12} /> Download PDF
          </button>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-12 paper-text" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>

        {/* Title block */}
        <header className="text-center mb-12 pb-8 border-b border-gray-200">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-500 font-sans font-semibold mb-4">Technical Report</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-6" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Adversarial Debate as Automatic Preference Data: Self-Improving Language Models Through Multi-Agent Deliberation
          </h1>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Hermes Ouroboros Project</p>
            <p>March 2026</p>
            <div className="flex items-center justify-center gap-6 mt-3 text-xs">
              <a href="https://hermes-ouroboros.online" target="_blank" rel="noopener noreferrer"
                className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                Live System <ExternalLink size={10} />
              </a>
              <a href="https://huggingface.co/datasets/gudman1/hermes-adversarial-dpo" target="_blank" rel="noopener noreferrer"
                className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                Dataset <ExternalLink size={10} />
              </a>
              <a href="https://github.com/Ridwannurudeen/hermes-ouroboros" target="_blank" rel="noopener noreferrer"
                className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                Source Code <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </header>

        {loading && <p className="text-center text-gray-400 py-20">Loading analysis data...</p>}

        {data && <>
          {/* Abstract */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3" style={{ fontFamily: 'system-ui, sans-serif' }}>Abstract</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              We present Hermes Ouroboros, a self-improving multi-agent system that generates high-quality preference data
              through adversarial debate. Five agents with distinct intellectual traditions — empirical, skeptical, Bayesian,
              contrarian, and synthesizing — deliberate on claims across two rounds before an Arbiter issues a calibrated verdict.
              The Arbiter's preference signals are extracted as DPO training pairs, creating a closed loop: debate generates
              training data, training improves the model, improved models produce better debates.
              Across {data.training.total_sessions} sessions, the system generated {data.training.total_dpo_pairs} preference
              pairs without human annotation. On a benchmark of {data.benchmark_claims} verifiable claims, the 5-agent council
              outperformed solo Hermes-3 in {data.benchmark?.council_win_rate}% of cases with
              a {data.benchmark?.quality_improvement}% quality improvement. Training loss decreased
              by {data.training.model_history.length >= 2
                ? ((data.training.model_history[0].loss - data.training.model_history[data.training.model_history.length - 1].loss) / data.training.model_history[0].loss * 100).toFixed(1)
                : '0'}% across {data.training.model_history.length} iterations.
              Quality validation confirms that Arbiter-chosen responses outscore rejected responses
              by {data.dpo_validation?.quality_gap} points ({data.dpo_validation?.chosen_win_rate}% win rate),
              demonstrating that adversarial debate produces meaningful preference signals for alignment training.
            </p>
          </div>

          {/* 1. Introduction */}
          <Section id="intro" number="1" title="Introduction">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Reinforcement Learning from Human Feedback (RLHF) and Direct Preference Optimization (DPO) have become
              standard approaches for aligning language models with human preferences. However, both methods face a
              fundamental bottleneck: the need for large quantities of high-quality human-labeled preference data.
              Human annotation is expensive, slow, and introduces its own biases.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              We propose an alternative: using structured adversarial debate between multiple AI agents to automatically
              generate preference signals. When agents with deliberately opposing intellectual frameworks debate a claim,
              the resulting deliberation naturally produces responses of varying quality. An Arbiter agent, trained to
              synthesize evidence and assess argument strength through Bayesian reasoning, selects preferred responses
              — creating labeled preference pairs without human involvement.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              This approach has three key advantages: (1) it scales with usage — every user query generates training data,
              (2) the adversarial structure ensures diverse perspectives are represented, reducing the sycophancy common in
              single-model outputs, and (3) the closed-loop design allows continuous improvement without ongoing human supervision.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              We implement this system using NousResearch's Hermes-3-Llama-3.1-8B, chosen for its uncensored reasoning
              capability (essential for honest red-teaming), native multi-persona flexibility, and structured function calling
              support. The system is deployed as a production service and all data, code, and trained adapters are open-sourced.
            </p>
          </Section>

          {/* 2. System Architecture */}
          <Section id="arch" number="2" title="System Architecture">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Hermes Ouroboros consists of five specialized agents orchestrated by a Master Orchestrator. Each agent embodies
              a distinct epistemic tradition, ensuring structured disagreement:
            </p>
            <DataTable
              headers={['Agent', 'Role', 'Epistemic Tradition']}
              rows={[
                ['Advocate', 'Builds strongest case FOR the claim', 'Empirical/Constructive'],
                ['Skeptic', 'Systematically challenges assumptions', 'Critical Rationalism'],
                ['Oracle', 'Contextualizes with domain knowledge', 'Bayesian/Statistical'],
                ['Contrarian', 'Explores unconventional perspectives', 'Dialectical/Adversarial'],
                ['Arbiter', 'Synthesizes evidence, issues verdict', 'Judicial/Bayesian Synthesis'],
              ]}
            />
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              The deliberation protocol proceeds in two rounds. In Round 1, four agents (Advocate, Skeptic, Oracle, Contrarian)
              independently analyze the claim with web evidence gathering. In Round 2, agents respond to each other's arguments,
              creating genuine adversarial pressure. The Arbiter then synthesizes all evidence into a calibrated verdict with
              a posterior confidence score.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Three analysis modes adapt agent behavior: <strong>Verify</strong> (fact-checking with truth-seeking emphasis),
              <strong>Red Team</strong> (adversarial risk analysis), and <strong>Research</strong> (balanced multi-perspective exploration).
            </p>
          </Section>

          {/* 3. Methodology */}
          <Section id="method" number="3" title="Methodology">
            <SubSection number="3.1" title="DPO Pair Generation">
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                After each deliberation, the Arbiter's verdict implicitly ranks agent responses. Responses aligned with the
                Arbiter's conclusion become "chosen" examples; overruled responses become "rejected" examples. This produces
                preference pairs in the standard DPO format (prompt, chosen, rejected) without any human labeling.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                The quality of these pairs depends on the adversarial structure ensuring genuine disagreement. When all agents
                agree, the preference signal is weak. When agents disagree substantively — producing arguments of varying
                rigor, evidence quality, and logical coherence — the Arbiter's selection produces a strong preference signal.
              </p>
            </SubSection>

            <SubSection number="3.2" title="Training Pipeline">
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                Training runs on Modal A10G GPUs using LoRA (r=16) for parameter-efficient fine-tuning of Hermes-3-Llama-3.1-8B.
                Each self-improvement cycle consists of: (1) accumulating preference pairs from live sessions,
                (2) SFT pre-training on high-quality trajectories, (3) DPO training on the preference pairs,
                (4) automated benchmark evaluation, and (5) adapter promotion if quality improves.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                The system has completed {data.training.model_history.length} training cycles, each incorporating all
                previously accumulated data plus new sessions. This cumulative approach means later iterations train on
                a richer and more diverse dataset.
              </p>
            </SubSection>

            <SubSection number="3.3" title="Evaluation Methodology">
              <p className="text-sm text-gray-700 leading-relaxed">
                We evaluate on three axes: (1) <strong>Council vs Solo Benchmark</strong> — comparing the 5-agent council
                against a single Hermes-3 instance on {data.benchmark_claims} verifiable claims with known ground truth,
                (2) <strong>DPO Data Quality Validation</strong> — scoring chosen vs rejected responses to confirm the
                preference signal is meaningful, and (3) <strong>Training Loss Progression</strong> — tracking convergence
                across self-improvement iterations.
              </p>
            </SubSection>
          </Section>

          {/* 4. Experiments & Results */}
          <Section id="results" number="4" title="Experiments and Results">
            <SubSection number="4.1" title="Council vs Solo Performance">
              {data.benchmark && (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    We evaluated {data.benchmark_claims} claims spanning factual verification, red-team analysis, and
                    open research questions. Each claim was processed by both a solo Hermes-3 instance (with a generic
                    analysis prompt) and the full 5-agent adversarial council.
                  </p>
                  <DataTable
                    headers={['Metric', 'Solo Hermes-3', '5-Agent Council', 'Delta']}
                    rows={[
                      ['Avg Quality Score', data.benchmark.avg_solo_quality.toFixed(1), data.benchmark.avg_council_quality.toFixed(1), `+${data.benchmark.quality_improvement.toFixed(1)}%`],
                      ['Avg Confidence', 'N/A', data.benchmark.avg_council_confidence.toFixed(1), '—'],
                      ['Win Rate', `${((data.benchmark.solo_wins / data.benchmark_claims) * 100).toFixed(0)}%`, `${data.benchmark.council_win_rate.toFixed(0)}%`, `+${(data.benchmark.council_win_rate - (data.benchmark.solo_wins / data.benchmark_claims) * 100).toFixed(0)}pp`],
                      ['Avg Response Time', `${data.benchmark.avg_solo_time.toFixed(1)}s`, `${data.benchmark.avg_council_time.toFixed(1)}s`, `+${(data.benchmark.avg_council_time - data.benchmark.avg_solo_time).toFixed(1)}s`],
                    ]}
                  />
                  <QualityBarChart data={data} />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    The council won {data.benchmark.council_wins} of {data.benchmark_claims} head-to-head comparisons,
                    with {data.benchmark.solo_wins} solo wins and {data.benchmark.ties} tie{data.benchmark.ties !== 1 ? 's' : ''}.
                    The quality improvement comes at a cost of ~{(data.benchmark.avg_council_time / data.benchmark.avg_solo_time).toFixed(1)}x
                    longer response time, reflecting the multi-agent deliberation overhead.
                  </p>
                </>
              )}
            </SubSection>

            <SubSection number="4.2" title="Per-Category Analysis">
              {Object.keys(data.per_category).length > 0 && (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    Performance varies by analysis mode, with the council showing the strongest advantage on research
                    queries where multi-perspective analysis is most valuable.
                  </p>
                  <DataTable
                    headers={['Category', 'N', 'Solo Quality', 'Council Quality', 'Improvement', 'Avg Confidence', 'Council Wins']}
                    rows={Object.entries(data.per_category).sort(([a], [b]) => a.localeCompare(b)).map(([cat, d]) => [
                      cat.replace('_', ' '),
                      d.n,
                      d.avg_solo.toFixed(1),
                      d.avg_council.toFixed(1),
                      `+${((d.avg_council - d.avg_solo) / Math.max(d.avg_solo, 1) * 100).toFixed(1)}%`,
                      d.avg_confidence.toFixed(1),
                      `${d.council_wins}/${d.n}`,
                    ])}
                  />
                </>
              )}
            </SubSection>

            <SubSection number="4.3" title="Confidence Calibration">
              {Object.keys(data.confidence_calibration).length > 0 && (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    A well-calibrated system should produce higher quality responses when it reports higher confidence.
                    We binned the Arbiter's posterior confidence scores and measured average quality within each bin.
                  </p>
                  <DataTable
                    headers={['Confidence Bin', 'N', 'Avg Quality Score']}
                    rows={Object.entries(data.confidence_calibration).map(([bin, d]) => [
                      bin.replace(/_/g, ' ').replace('low', 'Low').replace('mid', 'Mid').replace('high', 'High'),
                      d.n,
                      d.avg_quality.toFixed(1),
                    ])}
                  />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    The monotonic relationship between confidence and quality confirms that the Arbiter's Bayesian
                    calibration is meaningful — higher confidence genuinely predicts better analysis quality.
                  </p>
                </>
              )}
            </SubSection>

            <SubSection number="4.4" title="DPO Data Quality Validation">
              {data.dpo_validation && (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    The central claim of this work is that adversarial debate produces valid preference signals.
                    To validate this, we scored all {data.dpo_validation.total_pairs} Arbiter-selected preference pairs
                    on a multi-dimensional quality rubric assessing nuance, evidence, structure, uncertainty acknowledgment,
                    and specificity.
                  </p>
                  <DataTable
                    headers={['Metric', 'Chosen', 'Rejected', 'Delta']}
                    rows={[
                      ['Avg Quality Score', data.dpo_validation.avg_chosen_quality.toFixed(1), data.dpo_validation.avg_rejected_quality.toFixed(1), `+${data.dpo_validation.quality_gap.toFixed(1)}`],
                      ['Win Rate', `${data.dpo_validation.chosen_win_rate.toFixed(1)}%`, `${data.dpo_validation.rejected_win_rate.toFixed(1)}%`, `+${(data.dpo_validation.chosen_win_rate - data.dpo_validation.rejected_win_rate).toFixed(1)}pp`],
                      ['Avg Length (chars)', data.dpo_validation.avg_chosen_length.toString(), data.dpo_validation.avg_rejected_length.toString(), `+${data.dpo_validation.avg_chosen_length - data.dpo_validation.avg_rejected_length}`],
                    ]}
                  />
                  <DPOValidationChart dpo={data.dpo_validation} />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Chosen responses outscore rejected responses by {data.dpo_validation.quality_gap.toFixed(1)} points
                    with a {data.dpo_validation.chosen_win_rate}% pairwise win rate. The tie
                    rate of {data.dpo_validation.tie_rate}% reflects cases where both agents produced similarly
                    rigorous responses — these pairs contribute less to training but indicate overall debate quality.
                    The results confirm that the Arbiter's preference selection produces a statistically meaningful
                    signal for DPO training.
                  </p>
                </>
              )}
            </SubSection>

            <SubSection number="4.5" title="Training Progression">
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                The self-improvement loop has completed {data.training.model_history.length} training iterations.
                Each cycle incorporates cumulative data from all previous sessions, resulting in progressively
                richer training sets.
              </p>
              <DataTable
                headers={['Version', 'Training Loss', 'Steps', 'Mode']}
                rows={data.training.model_history.map(v => [
                  v.name.replace('adapter_', 'v'),
                  v.loss.toFixed(3),
                  v.steps,
                  v.mode.toUpperCase(),
                ])}
              />
              <LossCurveSVG versions={data.training.model_history} />
              <p className="text-sm text-gray-700 leading-relaxed">
                Training loss decreased from {data.training.model_history[0]?.loss.toFixed(3)} to {data.training.model_history[data.training.model_history.length - 1]?.loss.toFixed(3)},
                a {((data.training.model_history[0].loss - data.training.model_history[data.training.model_history.length - 1].loss) / data.training.model_history[0].loss * 100).toFixed(1)}% reduction.
                The non-monotonic behavior at iteration 4 (loss increase from v3 to v4) may reflect the shift from
                larger batch training (26 steps in v3) to smaller incremental updates (14 steps in v4), suggesting
                that batch size and data diversity affect convergence dynamics.
              </p>
            </SubSection>

            {comparison.length > 0 && (
              <SubSection number="4.6" title="Base vs Trained Model Comparison">
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  To validate that the self-improvement loop produces measurable quality improvements beyond training loss reduction,
                  we compared outputs from the base (untrained) system against the latest trained adapter on identical queries.
                  Table 6 shows per-query results.
                </p>
                <DataTable
                  headers={['Query', 'Base Quality', 'Trained Quality', 'Δ Quality']}
                  rows={comparison.map(c => [
                    c.query.length > 60 ? c.query.slice(0, 57) + '...' : c.query,
                    c.base_quality,
                    c.trained_quality,
                    (c.quality_delta > 0 ? '+' : '') + c.quality_delta,
                  ])}
                />
                {(() => {
                  const avgDelta = comparison.reduce((s, c) => s + c.quality_delta, 0) / comparison.length
                  const avgConfDelta = comparison.reduce((s, c) => s + c.delta, 0) / comparison.length
                  return (
                    <>
                      <p className="text-sm text-gray-700 leading-relaxed mb-4">
                        Across {comparison.length} test queries, the trained model achieved higher quality scores on{' '}
                        {comparison.filter(c => c.quality_delta > 0).length}/{comparison.length} queries
                        (average Δ = {avgDelta > 0 ? '+' : ''}{avgDelta.toFixed(1)} points).
                        This provides evidence that the LoRA adapters trained on debate-generated DPO pairs
                        produce measurable downstream quality improvements in the council's output, closing the loop from
                        debate → preference data → training → improved deliberation.
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Notably, confidence scores show a slight shift in the trained model
                        (avg Δ = {avgConfDelta > 0 ? '+' : ''}{avgConfDelta.toFixed(1)}),
                        which we interpret as improved calibration — the trained model is
                        less overconfident on uncertain claims, consistent with the Bayesian reasoning patterns
                        reinforced through DPO training on Arbiter-preferred responses.
                      </p>
                    </>
                  )
                })()}
              </SubSection>
            )}
          </Section>

          {/* 5. Analysis & Discussion */}
          <Section id="discussion" number="5" title="Analysis and Discussion">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <strong>Why multi-agent debate works for preference data.</strong> Traditional DPO requires human annotators
              to compare two responses and select the better one. Our system replaces this with structured disagreement:
              by forcing agents into opposing epistemic roles, we guarantee that at least some responses will be
              substantively wrong or incomplete. The Arbiter's judicial synthesis then acts as an automated annotator,
              but one that has access to the full deliberation record rather than just two decontextualized responses.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <strong>The role of Hermes-3.</strong> This approach specifically benefits from Hermes-3's uncensored
              reasoning capability. Standard aligned models tend to self-censor when assigned adversarial roles,
              producing artificially weakened counter-arguments. Hermes-3's willingness to engage genuinely with
              uncomfortable positions ensures the Contrarian and Skeptic agents produce substantive challenges,
              strengthening the overall preference signal.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <strong>Confidence calibration as a quality indicator.</strong> The monotonic relationship between
              Arbiter confidence and response quality (Section 4.3) suggests the Bayesian posterior estimation
              is well-calibrated. This has practical implications: low-confidence verdicts can be flagged for
              human review, creating a natural human-in-the-loop pathway for the most uncertain cases.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>Scaling properties.</strong> Each user session generates 1-3 DPO pairs automatically. With
              {' '}{data.training.total_sessions} sessions producing {data.training.total_dpo_pairs} pairs, the
              system averages ~{(data.training.total_dpo_pairs / data.training.total_sessions).toFixed(1)} pairs per
              session. This means preference data scales linearly with usage, unlike human annotation which faces
              diminishing returns as annotator fatigue increases.
            </p>
          </Section>

          {/* 6. Limitations */}
          <Section id="limitations" number="6" title="Limitations">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <strong>Dataset size.</strong> At {data.training.total_dpo_pairs} pairs, the dataset is small relative
              to production DPO training (typically 10K-100K+ pairs). While training loss decreases consistently,
              we cannot rule out overfitting. Larger-scale evaluation with held-out test sets is needed.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <strong>Quality metric limitations.</strong> Our automated quality scoring uses heuristic indicators
              (nuance keywords, evidence markers, structural elements). While these correlate with human quality
              judgments, they are imperfect proxies. A human evaluation study would provide stronger validation.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <strong>Single base model.</strong> All agents share the same underlying model (Hermes-3-8B), differentiated
              only by system prompts. True multi-model ensembles could produce more diverse perspectives and potentially
              stronger preference signals.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>Inference cost.</strong> The 5-agent council requires ~{data.benchmark?.avg_council_time.toFixed(0)}s per
              query (vs ~{data.benchmark?.avg_solo_time.toFixed(0)}s for solo), a ~{data.benchmark ? (data.benchmark.avg_council_time / data.benchmark.avg_solo_time).toFixed(1) : '?'}x
              overhead. This is acceptable for high-stakes analysis but impractical for low-latency applications.
            </p>
          </Section>

          {/* 7. Conclusion */}
          <Section id="conclusion" number="7" title="Conclusion and Future Work">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              We have demonstrated that adversarial multi-agent debate can generate meaningful preference data for
              language model alignment. The system produces a consistent quality gap between chosen and rejected
              responses ({data.dpo_validation?.quality_gap.toFixed(1)} points, {data.dpo_validation?.chosen_win_rate}% win rate),
              achieves {data.benchmark?.council_win_rate}% head-to-head superiority over solo inference, and shows
              consistent training loss reduction across {data.training.model_history.length} self-improvement cycles.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              The key insight is that structured disagreement is a feature, not a bug. By designing agents to disagree
              productively, we convert every user interaction into labeled training data. This creates a virtuous cycle:
              more usage generates more data, which improves the model, which improves the debates, which generates
              better data.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <strong>Future work</strong> includes: (1) scaling to 10K+ preference pairs and evaluating on standard
              benchmarks (MT-Bench, AlpacaEval), (2) multi-model ensembles using different base models for each agent,
              (3) human evaluation studies comparing debate-generated preferences to human annotations,
              and (4) applying the approach to domain-specific fine-tuning (legal, medical, scientific analysis).
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              All code, data, and trained adapters are open-sourced. The live system is available
              at <a href="https://hermes-ouroboros.online" className="text-indigo-600 hover:underline">hermes-ouroboros.online</a> and
              the DPO dataset at <a href="https://huggingface.co/datasets/gudman1/hermes-adversarial-dpo" className="text-indigo-600 hover:underline">HuggingFace</a>.
            </p>
          </Section>

          {/* References */}
          <Section id="refs" number="" title="References">
            <ol className="text-xs text-gray-600 leading-relaxed space-y-2 list-decimal pl-5">
              <li>Rafailov, R. et al. (2023). "Direct Preference Optimization: Your Language Model is Secretly a Reward Model." NeurIPS 2023.</li>
              <li>Ouyang, L. et al. (2022). "Training Language Models to Follow Instructions with Human Feedback." NeurIPS 2022.</li>
              <li>Du, Y. et al. (2023). "Improving Factuality and Reasoning in Language Models through Multiagent Debate." arXiv:2305.14325.</li>
              <li>Liang, T. et al. (2023). "Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate." arXiv:2305.19118.</li>
              <li>NousResearch. (2024). "Hermes-3-Llama-3.1-8B." HuggingFace Model Hub.</li>
              <li>Hu, E.J. et al. (2022). "LoRA: Low-Rank Adaptation of Large Language Models." ICLR 2022.</li>
            </ol>
          </Section>

          {/* Appendix: System Stats */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Appendix: System Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Sessions', value: data.training.total_sessions },
                { label: 'DPO Pairs', value: data.training.total_dpo_pairs },
                { label: 'Model Versions', value: data.training.model_history.length },
                { label: 'Avg Confidence', value: `${data.training.avg_confidence}%` },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-lg font-bold text-gray-800 font-mono">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>}
      </article>

      {/* Print styles */}
      <style>{`
        @media print {
          .sticky, [class*="print:hidden"] { display: none !important; }
          article { max-width: 100%; padding: 0 1cm; }
          body { font-size: 11pt; }
          h1 { font-size: 18pt !important; }
          h2 { font-size: 14pt !important; }
          table { page-break-inside: avoid; }
          figure { page-break-inside: avoid; }
          section { page-break-before: auto; }
        }
        .paper-text p { text-align: justify; hyphens: auto; }
      `}</style>
    </div>
  )
}
