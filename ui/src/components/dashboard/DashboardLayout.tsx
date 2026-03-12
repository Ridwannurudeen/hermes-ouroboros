import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface DashboardLayoutProps {
  children: ReactNode
  activePanel: string
  onPanelChange: (panel: string) => void
  providerName: string
  model: string
  onOpenPalette?: () => void
}

export default function DashboardLayout({ children, activePanel, onPanelChange, providerName, model, onOpenPalette }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#06060e] flex relative">
      {/* Static background glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="orb w-[600px] h-[600px] bg-indigo-600/[0.04] top-0 right-0" />
        <div className="orb w-[500px] h-[500px] bg-violet-600/[0.03] bottom-0 left-0" />
      </div>

      <Sidebar activePanel={activePanel} onPanelChange={onPanelChange} />
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        <TopBar providerName={providerName} model={model} onOpenPalette={onOpenPalette} />
        <main className="flex-1 p-6 overflow-y-auto dot-grid">
          {children}
        </main>
      </div>
    </div>
  )
}
