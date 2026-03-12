import {
  MessageSquare, History, BarChart3, GitBranch,
  Key, Settings, Sparkles, Scale, Share2, Download, Code,
  FolderOpen, Eye,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'query', icon: MessageSquare, label: 'Query' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'workspaces', icon: FolderOpen, label: 'Workspaces' },
  { id: 'watchlist', icon: Eye, label: 'Watchlist' },
  { id: 'stats', icon: BarChart3, label: 'Stats' },
  { id: 'loop', icon: GitBranch, label: 'DPO Loop' },
  { id: 'comparison', icon: Scale, label: 'Compare' },
  { id: 'skills', icon: Sparkles, label: 'Skills' },
  { id: 'share', icon: Share2, label: 'Share' },
  { id: 'export', icon: Download, label: 'Export' },
  { id: 'api', icon: Code, label: 'API Docs' },
  { id: 'keys', icon: Key, label: 'API Keys' },
  { id: 'auth', icon: Settings, label: 'Auth' },
]

interface SidebarProps {
  activePanel: string
  onPanelChange: (panel: string) => void
}

export default function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  return (
    <aside className="w-16 lg:w-56 border-r border-white/[0.04] bg-[#06060e] flex flex-col relative z-10">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/[0.04]">
        <div className="relative">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <span className="text-white font-bold text-sm">H</span>
          </div>
        </div>
        <span className="ml-3 font-display font-bold text-white/80 hidden lg:block tracking-tight">Ouroboros</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activePanel === id
          return (
            <button
              key={id}
              onClick={() => onPanelChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 relative
                ${isActive
                  ? 'text-white/90'
                  : 'text-white/25 hover:text-white/50 hover:bg-white/[0.02]'
                }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/[0.15]" />
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
              )}
              <Icon size={17} className="relative" />
              <span className="hidden lg:block relative">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Version */}
      <div className="p-4 border-t border-white/[0.04]">
        <p className="text-[10px] text-white/10 hidden lg:block font-mono">v1.0 ouroboros</p>
      </div>
    </aside>
  )
}
