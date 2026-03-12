export interface MetaResponse {
  provider_name: string
  model: string
  base_url: string
  session_count: number
  csrf_token: string | null
  current_role: 'admin' | 'user' | 'guest' | null
  current_user: string | null
  share_links_ready: boolean
  examples: string[]
  email_verification_enabled: boolean
}

export interface StatsResponse {
  total_sessions: number
  average_confidence_all_time: number
  average_confidence_last_10: number
  skills_created: number
  trajectory: TrajectoryStats
  training: TrainingStatus
  benchmark: BenchmarkStatus | null
}

export interface TrajectoryStats {
  total_trajectories: number
  recent_trajectories: number
  avg_quality_score: number
  status: string
}

export interface TrainingStatus {
  auto_train_enabled: boolean
  current_generation: number
  last_train_time: string | null
  next_train_eligible: boolean
  status: string
}

export interface BenchmarkStatus {
  available: boolean
  generations_tested: number[]
  latest_accuracy: number
}

export interface LoopStatus {
  generation: number
  trajectories_total: number
  trajectories_new: number
  min_for_training: number
  ready: boolean
  last_trained: string | null
  model_active: string
  status: string
}

export interface AgentTiming {
  duration_seconds: number
  status: 'ok' | 'error' | 'timeout'
}

export type AnalysisMode = 'default' | 'red_team' | 'verify' | 'research'

export interface VerdictSections {
  verdict_label?: string
  hermes_score?: number
  confidence?: number
  fatal_flaws?: string
  key_strengths?: string
  fix_or_die?: string
  thinking_traps?: string
  blind_spots?: string
  premortem?: string
  action_items?: string
  key_evidence_for?: string
  key_evidence_against?: string
  missing_context?: string
  source_credibility?: string
  bull_case_summary?: string
  bear_case_summary?: string
  key_uncertainties?: string
  dissenting_views?: string
  what_would_change?: string
  survival_probability?: number
  failure_probability?: number
  factual_accuracy?: number
  misleading_factor?: number
}

export interface EvidenceItem {
  title: string
  url: string
  snippet: string
  trust_tier?: 'Academic' | 'Government' | 'Major News' | 'Blog/Forum' | 'Unknown'
  recency?: 'Current' | 'Recent' | 'Dated' | 'Unknown'
  corroboration?: number
}

export interface WebEvidence {
  general: EvidenceItem[]
  counter: EvidenceItem[]
  statistical: EvidenceItem[]
}

export interface LoopStatusData {
  generation: number
  trajectories_total: number
  trajectories_new: number
  min_for_training: number
  ready: boolean
  last_trained: string | null
  model_active: string
  status: string
  current_version?: string
  total_dpo_pairs?: number
  sessions_total?: number
}

export interface ClaimItem {
  claim: string
  status: 'supported' | 'weakly_supported' | 'disputed' | 'insufficient_evidence'
  reasoning: string
  source_url?: string
}

export interface FeedbackData {
  session_id: string
  rating: number
  tags: string[]
  timestamp: string
}

export interface SessionResult {
  session_id: string
  timestamp: string
  query: string
  analysis_mode?: AnalysisMode
  arbiter_verdict: string
  /** @deprecated alias for arbiter_verdict */
  verdict?: string
  confidence_score: number
  hermes_score?: number
  verdict_sections?: VerdictSections
  conflict_detected: boolean
  conflict_summary: string
  dissent_summary: string
  agent_responses: Record<string, string>
  round2_responses?: Record<string, string> | null
  agent_timings: Record<string, AgentTiming>
  round2_timings?: Record<string, AgentTiming> | null
  additional_research: string
  backend: string
  skill_path: string | null
  share_id?: string | null
  dpo_pairs_created?: number
  web_evidence?: WebEvidence | null
  claim_breakdown?: ClaimItem[]
  feedback?: FeedbackData
}

export interface SessionSummary {
  session_id: string
  timestamp: string
  query: string
  arbiter_verdict?: string
  verdict?: string
  confidence_score: number
  conflict_detected: boolean
  backend: string
  analysis_mode?: AnalysisMode
}

export interface SSEAgentEvent {
  type: 'agent_complete'
  role: string
  duration_seconds: number
  status: string
  preview: string
}

export interface SSEFinalEvent {
  type: 'final'
  result: SessionResult
  runtime: RuntimeInfo
}

export interface SSEErrorEvent {
  type: 'error'
  message: string
}

export interface SSEAgentTokenEvent {
  type: 'agent_token'
  role: string
  token: string
}

export type SSEEvent = SSEAgentEvent | SSEFinalEvent | SSEErrorEvent | SSEAgentTokenEvent

export interface RuntimeInfo {
  total_seconds: number
  agent_timings: Record<string, AgentTiming>
}

export interface ApiKeyInfo {
  key_id: string
  prefix: string
  label: string
  created: string
}

export interface SkillInfo {
  name: string
  path: string
  created: string
  query: string
}

export interface ComparisonResult {
  generations: number[]
  metrics: Record<string, Record<string, number>>
}

export type AgentRole = 'advocate' | 'skeptic' | 'oracle' | 'contrarian' | 'arbiter'

export const AGENT_ROLES: AgentRole[] = ['advocate', 'skeptic', 'oracle', 'contrarian', 'arbiter']

export const AGENT_META: Record<AgentRole, { label: string; color: string; description: string }> = {
  advocate: { label: 'Advocate', color: 'cyan', description: 'Builds strongest case for the position' },
  skeptic: { label: 'Skeptic', color: 'amber', description: 'Tears arguments apart with rigor' },
  oracle: { label: 'Oracle', color: 'violet', description: 'Data and evidence, no opinions' },
  contrarian: { label: 'Contrarian', color: 'rose', description: 'Challenges the majority view' },
  arbiter: { label: 'Arbiter', color: 'emerald', description: 'Final judgment and verdict' },
}

export const MODE_AGENT_LABELS: Record<AnalysisMode, Record<AgentRole, string>> = {
  default: {
    advocate: 'Advocate',
    skeptic: 'Skeptic',
    oracle: 'Oracle',
    contrarian: 'Contrarian',
    arbiter: 'Arbiter',
  },
  red_team: {
    advocate: 'Strengths',
    skeptic: 'Fatal Flaws',
    oracle: 'Data Check',
    contrarian: 'Blind Spots',
    arbiter: 'Verdict',
  },
  verify: {
    advocate: 'Evidence For',
    skeptic: 'Evidence Against',
    oracle: 'Source Check',
    contrarian: 'Missing Context',
    arbiter: 'Verdict',
  },
  research: {
    advocate: 'Bull Case',
    skeptic: 'Bear Case',
    oracle: 'Data Analysis',
    contrarian: 'Alt Perspective',
    arbiter: 'Assessment',
  },
}

export interface ModeInfo {
  key: AnalysisMode
  label: string
  tagline: string
  icon: string
  color: string
}

export const ANALYSIS_MODES: ModeInfo[] = [
  { key: 'red_team', label: 'Red Team', tagline: 'Stress-test any idea', icon: 'shield', color: 'rose' },
  { key: 'verify', label: 'Verify', tagline: 'Fact-check any claim', icon: 'search', color: 'amber' },
  { key: 'research', label: 'Research', tagline: 'Deep-dive analysis', icon: 'chart', color: 'violet' },
]

/* ---------- Verdict Drift Types ---------- */

export interface DriftEntry {
  session_id: string
  timestamp: string
  query: string
  similarity: number
  hermes_score: number
  confidence_score: number
  verdict_label: string
  analysis_mode: AnalysisMode | string
  claim_count: number
  claim_statuses: Record<string, number>
}

export interface DriftAnalysis {
  has_drift: boolean
  similar_sessions: DriftEntry[]
  closest_match?: {
    session_id: string
    query: string
    timestamp: string
    similarity: number
  }
  score_delta?: number | null
  score_direction?: 'improved' | 'declined' | 'stable'
  current_score: number
  past_score: number
  label_changed?: boolean
  current_label?: string
  past_label?: string
  current_claims: number
  past_claims: number
}

/* ---------- Claim Ledger Types ---------- */

export interface ClaimLedger {
  total_claims: number
  total_sessions: number
  sessions_with_claims: number
  status_breakdown: Record<string, number>
  supported_pct: number
  disputed_pct: number
  recent_claims: LedgerClaim[]
}

export interface LedgerClaim {
  claim: string
  status: string
  session_id: string
  query: string
  timestamp: string
  hermes_score: number
}
