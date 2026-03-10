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

export interface SessionResult {
  session_id: string
  timestamp: string
  query: string
  verdict: string
  confidence_score: number
  conflict_detected: boolean
  conflict_summary: string
  dissent_summary: string
  agent_responses: Record<string, string>
  agent_timings: Record<string, AgentTiming>
  additional_research: string
  backend: string
  skill_path: string | null
  share_id?: string | null
  dpo_pairs_created?: number
}

export interface SessionSummary {
  session_id: string
  timestamp: string
  query: string
  verdict: string
  confidence_score: number
  conflict_detected: boolean
  backend: string
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

export type SSEEvent = SSEAgentEvent | SSEFinalEvent | SSEErrorEvent

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
  advocate: { label: 'Advocate', color: 'indigo', description: 'Builds strongest case for the position' },
  skeptic: { label: 'Skeptic', color: 'amber', description: 'Tears arguments apart with rigor' },
  oracle: { label: 'Oracle', color: 'violet', description: 'Data and evidence, no opinions' },
  contrarian: { label: 'Contrarian', color: 'rose', description: 'Challenges the majority view' },
  arbiter: { label: 'Arbiter', color: 'emerald', description: 'Final judgment and verdict' },
}
