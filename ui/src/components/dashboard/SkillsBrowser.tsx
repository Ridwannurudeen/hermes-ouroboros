import { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import GlassCard from '../ui/GlassCard'
import { Sparkles, Clock } from 'lucide-react'
import type { SkillInfo } from '../../api/types'

export default function SkillsBrowser() {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<SkillInfo[]>('/api/skills')
      .then(setSkills)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-amber-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Auto-Generated Skills</h2>
      </div>

      {error && <p className="text-xs text-white/40">{error}</p>}

      {skills.length === 0 && !error && (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-white/30">No skills generated yet. Run queries to build the skill library.</p>
        </GlassCard>
      )}

      <div className="space-y-2">
        {skills.map((skill) => (
          <GlassCard key={skill.path} hover className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-white/80">{skill.name}</h4>
                <p className="text-xs text-white/40 mt-1 line-clamp-1">{skill.query}</p>
              </div>
              <span className="text-[10px] text-white/30 flex items-center gap-1 flex-shrink-0">
                <Clock size={10} /> {new Date(skill.created).toLocaleDateString()}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
