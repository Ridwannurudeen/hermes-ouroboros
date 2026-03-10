import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface DashboardLayoutProps {
  children: ReactNode
  activePanel: string
  onPanelChange: (panel: string) => void
  providerName: string
  model: string
}

export default function DashboardLayout({ children, activePanel, onPanelChange, providerName, model }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#06060e] noise flex relative">
      {/* Background mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/[0.03] rounded-full blur-[100px]" />
      </div>

      <Sidebar activePanel={activePanel} onPanelChange={onPanelChange} />
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        <TopBar providerName={providerName} model={model} />
        <main className="flex-1 p-6 overflow-y-auto dot-grid">
          {children}
        </main>
      </div>
    </div>
  )
}
