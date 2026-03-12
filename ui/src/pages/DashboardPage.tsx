import { useState, useEffect, useCallback, useRef } from 'react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import QueryPanel from '../components/dashboard/QueryPanel'
import AgentProgressGrid from '../components/dashboard/AgentProgressGrid'
import AgentStreamPanel from '../components/dashboard/AgentStreamPanel'
import CouncilRing from '../components/dashboard/CouncilRing'
import DeliberationTimeline from '../components/dashboard/DeliberationTimeline'
import ResultPanel from '../components/dashboard/ResultPanel'
import SessionHistory from '../components/dashboard/SessionHistory'
import StatsPanel from '../components/dashboard/StatsPanel'
import ModelTimeline from '../components/dashboard/ModelTimeline'
import ComparisonPanel from '../components/dashboard/ComparisonPanel'
import SkillsBrowser from '../components/dashboard/SkillsBrowser'
import ShareControls from '../components/dashboard/ShareControls'
import ExportControls from '../components/dashboard/ExportControls'
import ApiKeysPanel from '../components/dashboard/ApiKeysPanel'
import ApiPlayground from '../components/dashboard/ApiPlayground'
import CommandPalette from '../components/dashboard/CommandPalette'
import AuthPanel from '../components/dashboard/AuthPanel'
import GlassCard from '../components/ui/GlassCard'
import StatTile from '../components/ui/StatTile'
import { useMeta } from '../hooks/useMeta'
import { useStats } from '../hooks/useStats'
import { useLoopStatus } from '../hooks/useLoopStatus'
import { useSessions } from '../hooks/useSessions'
import { useSSE } from '../hooks/useSSE'
import { useSessionStore } from '../store/session'
import { apiPost } from '../api/client'
import type { AnalysisMode } from '../api/types'

export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState('query')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [currentAnalysisMode, setCurrentAnalysisMode] = useState<AnalysisMode>('red_team')
  const [soloResult, setSoloResult] = useState<{ response: string; elapsed_seconds: number } | null>(null)
  const [soloLoading, setSoloLoading] = useState(false)
  const [followUpQuery, setFollowUpQuery] = useState('')
  const meta = useMeta()
  const stats = useStats()
  const loopStatus = useLoopStatus()
  const { sessions, loading: sessionsLoading, fetchSessions } = useSessions()
  const sse = useSSE()
  const { setSelectedSession, setCurrentSession } = useSessionStore()

  // Store refetch functions in refs to keep callbacks stable
  const metaRefetchRef = useRef(meta.refetch)
  const statsRefetchRef = useRef(stats.refetch)
  const loopRefetchRef = useRef(loopStatus.refetch)
  const fetchSessionsRef = useRef(fetchSessions)
  metaRefetchRef.current = meta.refetch
  statsRefetchRef.current = stats.refetch
  loopRefetchRef.current = loopStatus.refetch
  fetchSessionsRef.current = fetchSessions

  useEffect(() => {
    if (meta.data) {
      fetchSessionsRef.current()
    }
  }, [meta.data])

  const handleRefresh = useCallback(() => {
    metaRefetchRef.current()
    statsRefetchRef.current()
    loopRefetchRef.current()
    fetchSessionsRef.current()
  }, [])

  const handleFollowUp = useCallback((query: string) => {
    setFollowUpQuery(query)
    setActivePanel('query')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleQuery = useCallback(async (query: string, mode: string, analysisMode: AnalysisMode = 'default', compare?: boolean) => {
    setFollowUpQuery('')
    setCurrentAnalysisMode(analysisMode)
    setSoloResult(null)
    setSoloLoading(false)

    // Start council SSE
    const councilPromise = sse.startQuery(query, mode, analysisMode)

    // If compare mode, also fire solo query in parallel
    if (compare) {
      setSoloLoading(true)
      apiPost<{ response: string; elapsed_seconds: number }>('/api/query/solo', { query })
        .then((res) => {
          setSoloResult(res)
          setSoloLoading(false)
        })
        .catch(() => {
          setSoloLoading(false)
        })
    }

    await councilPromise
  }, [sse.startQuery])

  // When SSE finishes, update state and refresh
  const prevFinalRef = useRef(sse.finalPayload)
  useEffect(() => {
    if (sse.finalPayload && sse.finalPayload !== prevFinalRef.current) {
      prevFinalRef.current = sse.finalPayload
      const result = sse.finalPayload.result
      setSelectedSession(result.session_id)
      setCurrentSession(result)
      handleRefresh()
    }
  }, [sse.finalPayload, setSelectedSession, setCurrentSession, handleRefresh])

  // Ctrl+K command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const providerName = meta.data?.provider_name || '...'
  const model = meta.data?.model || '...'
  const examples = meta.data?.examples || []

  return (
    <DashboardLayout
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      providerName={providerName}
      model={model}
      onOpenPalette={() => setPaletteOpen(true)}
    >
      {activePanel === 'query' && (
        <div className="space-y-6 max-w-4xl">
          {/* Hero stats */}
          {meta.data && (
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Provider" value={providerName} delay={0} />
              <StatTile label="Sessions" value={meta.data.session_count} delay={0.1} />
              <StatTile label="Model" value={model.split('/').pop() || model} delay={0.2} />
            </div>
          )}

          {/* Query input */}
          <QueryPanel
            examples={examples}
            isStreaming={sse.isStreaming}
            elapsed={sse.elapsed}
            onSubmit={handleQuery}
            initialQuery={followUpQuery}
          />

          {/* Council Ring visualization */}
          {(sse.isStreaming || Object.keys(sse.completedAgents).length > 0) && (
            <CouncilRing
              completedAgents={sse.completedAgents}
              isStreaming={sse.isStreaming}
              conflict={sse.finalPayload?.result?.conflict_detected}
              isFinal={!!sse.finalPayload}
            />
          )}

          {/* Deliberation Timeline */}
          {(sse.isStreaming || Object.keys(sse.completedAgents).length > 0) && (
            <DeliberationTimeline
              completedAgents={sse.completedAgents}
              isStreaming={sse.isStreaming}
              isFinal={!!sse.finalPayload}
              hasRound2={Object.keys(sse.streamingText).some((k) => k.startsWith('r2_'))}
            />
          )}

          {/* Live agent token streaming */}
          {!sse.finalPayload && (sse.isStreaming || Object.keys(sse.streamingText).length > 0) && (
            <AgentStreamPanel
              streamingText={sse.streamingText}
              completedAgents={sse.completedAgents}
              isStreaming={sse.isStreaming}
              analysisMode={currentAnalysisMode}
            />
          )}

          {/* Error */}
          {sse.error && (
            <GlassCard className="p-5 border-rose-500/30">
              <p className="text-sm text-rose-400">{sse.error}</p>
            </GlassCard>
          )}

          {/* Result */}
          {sse.finalPayload && (
            <ResultPanel
              result={sse.finalPayload.result}
              soloResult={soloResult}
              soloLoading={soloLoading}
              loopStatus={loopStatus.data}
              onFollowUp={handleFollowUp}
            />
          )}
        </div>
      )}

      {activePanel === 'history' && (
        <div className="max-w-2xl">
          <SessionHistory
            sessions={sessions}
            loading={sessionsLoading}
            onSearch={(q) => fetchSessions({ q })}
            onRefresh={() => fetchSessions()}
          />
        </div>
      )}

      {activePanel === 'stats' && (
        <div className="max-w-3xl">
          <StatsPanel stats={stats.data} />
        </div>
      )}

      {activePanel === 'loop' && (
        <div className="max-w-2xl">
          <ModelTimeline loopStatus={loopStatus.data} />
        </div>
      )}

      {activePanel === 'comparison' && (
        <div className="max-w-3xl">
          <ComparisonPanel />
        </div>
      )}

      {activePanel === 'skills' && (
        <div className="max-w-2xl">
          <SkillsBrowser />
        </div>
      )}

      {activePanel === 'share' && (
        <div className="max-w-lg">
          <ShareControls />
        </div>
      )}

      {activePanel === 'export' && (
        <div className="max-w-lg">
          <ExportControls />
        </div>
      )}

      {activePanel === 'keys' && (
        <div className="max-w-lg">
          <ApiKeysPanel />
        </div>
      )}

      {activePanel === 'api' && (
        <div className="max-w-3xl">
          <ApiPlayground />
        </div>
      )}

      {activePanel === 'auth' && (
        <AuthPanel onRefresh={handleRefresh} />
      )}

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onAction={setActivePanel} />
    </DashboardLayout>
  )
}
