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
          <div className="flex border border-white/[0.04] rounded-xl overflow-hidden bg-white/[0.01]">
            <button
              onClick={() => setMode('default')}
              className={`px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                mode === 'default' ? 'bg-indigo-500/10 text-indigo-300/80 border-r border-indigo-500/10' : 'text-white/20 hover:text-white/40 border-r border-white/[0.04]'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setMode('trained')}
              className={`px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                mode === 'trained' ? 'bg-emerald-500/10 text-emerald-300/80' : 'text-white/20 hover:text-white/40'
              }`}
            >
              Trained
            </button>
          </div>

          {isStreaming && (
            <div className="flex items-center gap-1.5 text-xs text-white/25 font-mono">
              <Clock size={11} />
              <span>{elapsed}s</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isStreaming}
          className="btn-glow flex items-center gap-2.5 px-6 py-2.5 text-white rounded-xl text-sm font-semibold tracking-wide
            disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isStreaming ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Deliberating...
            </>
          ) : (
            <>
              <Play size={15} /> Run Council
            </>
          )}
        </button>
      </div>

      <ExampleChips examples={examples} onSelect={setQuery} />
    </div>
  )
}
