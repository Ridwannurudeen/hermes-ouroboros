import { useState, useRef } from 'react'
import CommandInput from '../ui/CommandInput'
import ExampleChips from '../ui/ExampleChips'
import { Play, Loader2, Clock } from 'lucide-react'

interface QueryPanelProps {
  examples: string[]
  isStreaming: boolean
  elapsed: number
  onSubmit: (query: string, mode: string) => void
}

export default function QueryPanel({ examples, isStreaming, elapsed, onSubmit }: QueryPanelProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('default')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!query.trim() || isStreaming) return
    onSubmit(query.trim(), mode)
  }

  return (
    <div className="space-y-4">
      <CommandInput
        ref={textareaRef}
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        disabled={isStreaming}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setMode('default')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'default' ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setMode('trained')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'trained' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Trained
            </button>
          </div>

          {isStreaming && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Clock size={12} />
              <span>{elapsed}s</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isStreaming}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-500 to-violet-500 text-white rounded-xl text-sm font-medium
            hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isStreaming ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Council Deliberating...
            </>
          ) : (
            <>
              <Play size={16} /> Run Council
            </>
          )}
        </button>
      </div>

      <ExampleChips examples={examples} onSelect={setQuery} />
    </div>
  )
}
