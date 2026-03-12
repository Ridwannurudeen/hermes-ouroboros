const ROLE_TRAIT_COLORS: Record<string, string> = {
  advocate: 'bg-cyan-500/10 text-cyan-400',
  skeptic: 'bg-amber-500/10 text-amber-400',
  oracle: 'bg-violet-500/10 text-violet-400',
  contrarian: 'bg-rose-500/10 text-rose-400',
  arbiter: 'bg-emerald-500/10 text-emerald-400',
}

export const AGENT_PERSONALITY: Record<string, { trait: string; approach: string; hermes: string }> = {
  advocate: {
    trait: 'Strategic Optimist',
    approach: 'Finds hidden strengths others miss',
    hermes: 'Hermes character depth enables genuine advocacy without sycophancy',
  },
  skeptic: {
    trait: 'Ruthless Analyst',
    approach: 'Tears every argument apart for fatal flaws',
    hermes: 'Hermes uncensored reasoning catches risks other models self-censor',
  },
  oracle: {
    trait: 'Data Purist',
    approach: 'Only verifiable facts and statistics',
    hermes: 'Hermes function-calling drives structured evidence gathering',
  },
  contrarian: {
    trait: "Devil's Advocate",
    approach: 'Forces confrontation with uncomfortable blind spots',
    hermes: 'Hermes multi-persona flexibility enables authentic contrarian thinking',
  },
  arbiter: {
    trait: 'Final Judge',
    approach: 'Synthesizes all perspectives into calibrated verdict',
    hermes: 'Hermes long-context reasoning synthesizes across all agents',
  },
}

export function PersonalityBadge({ role }: { role: string }) {
  const info = AGENT_PERSONALITY[role]
  if (!info) return null
  const colors = ROLE_TRAIT_COLORS[role] || 'bg-white/5 text-white/40'

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors}`}>
        {info.trait}
      </span>
      <span className="text-[10px] text-white/25 italic">{info.approach}</span>
    </div>
  )
}
