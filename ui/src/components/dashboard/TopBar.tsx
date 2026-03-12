import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Pill from '../ui/Pill'
import ThemeToggle from '../ui/ThemeToggle'
import { useAuthStore } from '../../store/auth'
import { Cpu, User, Shield, Command } from 'lucide-react'

interface TopBarProps {
  providerName: string
  model: string
  onOpenPalette?: () => void
}

export default function TopBar({ providerName, model, onOpenPalette }: TopBarProps) {
  const { currentRole, currentUser } = useAuthStore()
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes('MAC'))
  }, [])

  return (
    <header className="h-16 border-b border-white/[0.04] bg-[#06060e] flex items-center justify-between px-6 relative z-10">
      <div className="flex items-center gap-3">
        <Cpu size={14} className="text-white/20" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/[0.1]">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[11px] font-medium text-indigo-300/80">{providerName}</span>
        </div>
        <span className="text-[11px] text-white/20 font-mono">{model}</span>
      </div>

      <div className="flex items-center gap-3">
        {currentRole === 'admin' && (
          <Pill variant="warning">
            <Shield size={11} className="mr-1" /> Admin
          </Pill>
        )}
        {currentRole === 'user' && currentUser && (
          <Pill variant="success">
            <User size={11} className="mr-1" /> {currentUser}
          </Pill>
        )}
        {!currentRole && (
          <span className="text-[11px] text-white/15 font-medium">Guest</span>
        )}

        <motion.button
          onClick={onOpenPalette}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ delay: 1.5, duration: 0.6, ease: 'easeInOut' }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/15 hover:text-white/30 hover:bg-white/[0.04] transition-colors cursor-pointer"
          title="Command palette"
        >
          <Command size={11} />
          <kbd className="text-[10px] font-mono font-medium">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
        </motion.button>

        <ThemeToggle />
      </div>
    </header>
  )
}
