import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, History, BarChart3, GitBranch,
  Download, Code, Scale, Shield, Search, Command,
} from 'lucide-react'

const COMMANDS = [
  { id: 'query', label: 'New Query', shortcut: 'Q', icon: MessageSquare },
  { id: 'red_team_mode', label: 'Red Team Mode', icon: Shield, action: 'query' },
  { id: 'verify_mode', label: 'Verify Mode', icon: Search, action: 'query' },
  { id: 'research_mode', label: 'Research Mode', icon: BarChart3, action: 'query' },
  { id: 'history', label: 'Session History', shortcut: 'H', icon: History },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
  { id: 'loop', label: 'DPO Training Loop', icon: GitBranch },
  { id: 'export', label: 'Export Session', icon: Download },
  { id: 'api', label: 'API Documentation', icon: Code },
  { id: 'comparison', label: 'Model Comparison', icon: Scale },
]

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onAction: (panel: string) => void
}

export default function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => COMMANDS.filter((c) => c.label.toLowerCase().includes(search.toLowerCase())),
    [search],
  )

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [search])

  const select = (cmd: typeof COMMANDS[number]) => {
    onAction(cmd.action || cmd.id)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      select(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-md z-50"
          >
            <div className="rounded-xl border border-white/[0.08] bg-[#0a0a14]/95 shadow-2xl shadow-black/50 overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <Command size={16} className="text-white/20" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
                />
                <kbd className="text-[10px] text-white/15 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">ESC</kbd>
              </div>

              {/* Command list */}
              <div className="max-h-[300px] overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <p className="text-xs text-white/20 text-center py-6">No commands found</p>
                )}
                {filtered.map((cmd, i) => {
                  const Icon = cmd.icon
                  const isActive = i === activeIndex
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => select(cmd)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-cyan-500/10' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-cyan-400' : 'text-white/25'} />
                      <span className={`flex-1 text-sm ${isActive ? 'text-white/90' : 'text-white/50'}`}>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          isActive
                            ? 'text-cyan-300/60 bg-cyan-500/10 border-cyan-500/20'
                            : 'text-white/15 bg-white/[0.02] border-white/[0.06]'
                        }`}>{cmd.shortcut}</kbd>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.04] text-[10px] text-white/15">
                <span><kbd className="bg-white/[0.04] px-1 rounded">↑↓</kbd> Navigate</span>
                <span><kbd className="bg-white/[0.04] px-1 rounded">↵</kbd> Select</span>
                <span><kbd className="bg-white/[0.04] px-1 rounded">Esc</kbd> Close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
