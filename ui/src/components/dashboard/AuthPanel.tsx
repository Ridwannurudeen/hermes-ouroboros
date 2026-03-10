import { useState } from 'react'
import { apiPost, apiFetch } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import GlassCard from '../ui/GlassCard'
import { LogIn, UserPlus, LogOut, Key, Mail } from 'lucide-react'

interface AuthPanelProps {
  onRefresh: () => void
}

export default function AuthPanel({ onRefresh }: AuthPanelProps) {
  const { adminToken, setAdminToken, currentRole, currentUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    try {
      await apiPost('/api/register', { email, password })
      setStatus('Account created and logged in.')
      onRefresh()
    } catch (e: any) {
      setStatus(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    try {
      await apiPost('/api/login', { email, password })
      setStatus('Logged in.')
      onRefresh()
    } catch (e: any) {
      setStatus(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await apiPost('/api/logout', {})
      useAuthStore.getState().clearAuth()
      setStatus('Logged out.')
      onRefresh()
    } catch (e: any) {
      setStatus(e.message)
    }
  }

  const handleForgotPassword = async () => {
    try {
      await apiPost('/api/forgot-password', { email: forgotEmail })
      setStatus('Password reset email sent.')
    } catch (e: any) {
      setStatus(e.message)
    }
  }

  const handleAdminTokenChange = (value: string) => {
    setAdminToken(value)
    setTimeout(() => onRefresh(), 300)
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* User Auth */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
          <LogIn size={16} /> Account Access
        </h3>

        {currentRole === 'user' ? (
          <div className="space-y-3">
            <p className="text-sm text-white/60">Signed in as <span className="text-emerald-400">{currentUser}</span></p>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-rose-500/15 text-rose-400 rounded-xl text-sm hover:bg-rose-500/25 transition-colors">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50"
            />
            <div className="flex gap-2">
              <button onClick={handleLogin} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500/15 text-brand-400 rounded-xl text-sm hover:bg-brand-500/25 transition-colors disabled:opacity-50">
                <LogIn size={14} /> Sign In
              </button>
              <button onClick={handleRegister} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                <UserPlus size={14} /> Register
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Admin Token */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Key size={16} /> Admin Override
        </h3>
        <p className="text-xs text-white/40 mb-3">Optional bearer token for admin access to all sessions.</p>
        <input
          type="password"
          placeholder="Admin token"
          value={adminToken}
          onChange={(e) => handleAdminTokenChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 font-mono"
        />
      </GlassCard>

      {/* Forgot Password */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Mail size={16} /> Password Reset
        </h3>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Email address"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50"
          />
          <button onClick={handleForgotPassword} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors">
            Send
          </button>
        </div>
      </GlassCard>

      {status && (
        <p className="text-xs text-white/50 px-1">{status}</p>
      )}
    </div>
  )
}
