import Pill from '../ui/Pill'
import ThemeToggle from '../ui/ThemeToggle'
import { useAuthStore } from '../../store/auth'
import { Cpu, User, Shield } from 'lucide-react'

interface TopBarProps {
  providerName: string
  model: string
}

export default function TopBar({ providerName, model }: TopBarProps) {
  const { currentRole, currentUser } = useAuthStore()

  return (
    <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-xl flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Cpu size={16} className="text-white/40" />
        <Pill variant="info">{providerName}</Pill>
        <span className="text-xs text-white/40 font-mono">{model}</span>
      </div>

      <div className="flex items-center gap-3">
        {currentRole === 'admin' && (
          <Pill variant="warning">
            <Shield size={12} className="mr-1" /> Admin
          </Pill>
        )}
        {currentRole === 'user' && currentUser && (
          <Pill variant="success">
            <User size={12} className="mr-1" /> {currentUser}
          </Pill>
        )}
        {!currentRole && (
          <Pill variant="default">Guest</Pill>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
