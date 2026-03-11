import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import VerdictPage from './pages/VerdictPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<DashboardPage />} />
      <Route path="/app/*" element={<DashboardPage />} />
      <Route path="/verdict/:sessionId" element={<VerdictPage />} />
    </Routes>
  )
}
