import AgentCard from './AgentCard'
import type { AgentRole, SSEAgentEvent } from '../../api/types'

const STREAMING_AGENTS: AgentRole[] = ['advocate', 'skeptic', 'oracle', 'contrarian']

interface AgentProgressGridProps {
  completedAgents: Record<string, SSEAgentEvent>
  isStreaming: boolean
}

export default function AgentProgressGrid({ completedAgents, isStreaming }: AgentProgressGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {STREAMING_AGENTS.map((role, i) => (
        <AgentCard
          key={role}
          role={role}
          event={completedAgents[role]}
          isStreaming={isStreaming}
          index={i}
        />
      ))}
    </div>
  )
}
