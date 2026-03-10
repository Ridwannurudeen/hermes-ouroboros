import {
  MessageSquare, History, BarChart3, GitBranch,
  Key, Settings, Sparkles, Scale, Share2, Download,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'query', icon: MessageSquare, label: 'Query' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'stats', icon: BarChart3, label: 'Stats' },
  { id: 'loop', icon: GitBranch, label: 'DPO Loop' },
  { id: 'comparison', icon: Scale, label: 'Compare' },
  { id: 'skills', icon: Sparkles, label: 'Skills' },
  { id: 'share', icon: Share2, label: 'Share' },
  { id: 'export', icon: Download, label: 'Export' },
  { id: 'keys', icon: Key, label: 'API Keys' },
  { id: 'auth', icon: Settings, label: 'Auth' },
]

interface SidebarProps {
  activePanel: string
  onPanelChange: (panel: string) => void
}

export default function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  return (
    <aside className="w-16 lg:w-56 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        <span className="ml-3 font-display font-bold text-white hidden lg:block">Ouroboros</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onPanelChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${activePanel === id
                ? 'bg-brand-500/15 text-brand-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
          >
            <Icon size={18} />
            <span className="hidden lg:block">{label}</span>
          </button>
        ))}
      </nav>

      {/* Version */}
      <div className="p-4 border-t border-white/10">
        <p className="text-[10px] text-white/20 hidden lg:block">Hermes Ouroboros v1.0</p>
      </div>
    </aside>
  )
}
