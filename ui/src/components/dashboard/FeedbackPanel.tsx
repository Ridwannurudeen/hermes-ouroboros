import { useState } from 'react'
import { motion } from 'framer-motion'
import { apiPost } from '../../api/client'
import type { FeedbackData } from '../../api/types'

const FEEDBACK_TAGS = [
  'weak sources',
  'missed counterargument',
  'too confident',
  'too vague',
  'best answer',
  'actionable',
]

interface FeedbackPanelProps {
  sessionId: string
  existing?: FeedbackData | null
}

export default function FeedbackPanel({ sessionId, existing }: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(existing || null)
  const [selectedTags, setSelectedTags] = useState<string[]>(existing?.tags || [])
  const [submitting, setSubmitting] = useState(false)

  const handleRate = async (rating: number) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await apiPost<{ ok: boolean; feedback: FeedbackData }>(
        `/api/sessions/${sessionId}/feedback`,
        { rating, tags: selectedTags }
      )
      setFeedback(res.feedback)
    } catch {
      // Silently fail — non-critical
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  if (feedback) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3 py-3 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
      >
        <div className="flex items-center gap-2">
          <span className={`text-lg ${feedback.rating > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {feedback.rating > 0 ? '\u25B2' : '\u25BC'}
          </span>
          <span className="text-xs text-white/50">
            {feedback.rating > 0 ? 'Helpful' : 'Not helpful'}
          </span>
        </div>
        {feedback.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {feedback.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {tag}
              </span>
            ))}
          </div>
        )}
        <span className="text-[10px] text-white/25 ml-auto">Feedback saved — feeds DPO training</span>
      </motion.div>
    )
  }

  return (
    <div className="py-3 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
      {/* Tags first — pick before rating */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] text-white/30 self-center mr-1">Tag this verdict:</span>
        {FEEDBACK_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors
              ${selectedTags.includes(tag)
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-white/[0.03] text-white/40 border-white/[0.08] hover:border-white/20'
              }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Rate buttons */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
        <span className="text-xs text-white/40">Rate:</span>
        <div className="flex gap-2">
          <button
            onClick={() => handleRate(1)}
            disabled={submitting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
              hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <span className="text-sm">{'\u25B2'}</span> Helpful
          </button>
          <button
            onClick={() => handleRate(-1)}
            disabled={submitting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-rose-500/10 text-rose-400 border border-rose-500/20
              hover:bg-rose-500/20 transition-colors disabled:opacity-50"
          >
            <span className="text-sm">{'\u25BC'}</span> Not helpful
          </button>
        </div>
        <span className="text-[10px] text-white/20 ml-auto">Your feedback trains the model</span>
      </div>
    </div>
  )
}
