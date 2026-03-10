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
    <div className="min-h-screen gradient-bg flex">
      <Sidebar activePanel={activePanel} onPanelChange={onPanelChange} />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopBar providerName={providerName} model={model} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
