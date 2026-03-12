import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { apiFetch } from '../../api/client'
import type { ClaimLedger } from '../../api/types'

interface ClaimLedgerBadgeProps {
  compact?: boolean
}

export default function ClaimLedgerBadge({ compact }: ClaimLedgerBadgeProps) {
  const [ledger, setLedger] = useState<ClaimLedger | null>(null)

  useEffect(() => {
    apiFetch<ClaimLedger>('/api/claims/ledger')
      .then(setLedger)
      .catch(() => {})
  }, [])

  if (!ledger || ledger.total_claims === 0) return null

  const { total_claims, sessions_with_claims, status_breakdown, supported_pct, disputed_pct } = ledger

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
      >
        <ShieldCheck size={14} className="text-brand-400 flex-shrink-0" />
        <span className="text-xs text-white/50">
          <span className="font-bold text-white/80">{total_claims.toLocaleString()}</span> claims verified across{' '}
          <span className="font-medium text-white/60">{sessions_with_claims}</span> sessions
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-brand-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Claim Intelligence Ledger</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold text-white">{total_claims.toLocaleString()}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Claims Verified</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{supported_pct}%</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Supported</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-400">{disputed_pct}%</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Disputed</p>
          </div>
        </div>

        {/* Status breakdown bar */}
        <div className="space-y-2">
          <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
            {(status_breakdown.supported ?? 0) > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((status_breakdown.supported ?? 0) / total_claims) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="bg-emerald-500 h-full"
              />
            )}
            {(status_breakdown.weakly_supported ?? 0) > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((status_breakdown.weakly_supported ?? 0) / total_claims) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="bg-amber-500 h-full"
              />
            )}
            {(status_breakdown.disputed ?? 0) > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((status_breakdown.disputed ?? 0) / total_claims) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="bg-rose-500 h-full"
              />
            )}
            {(status_breakdown.insufficient_evidence ?? 0) > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((status_breakdown.insufficient_evidence ?? 0) / total_claims) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="bg-white/20 h-full"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-[10px]">
            {(status_breakdown.supported ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-white/40">
                <CheckCircle2 size={10} className="text-emerald-400" />
                {status_breakdown.supported} Supported
              </span>
            )}
            {(status_breakdown.weakly_supported ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-white/40">
                <AlertTriangle size={10} className="text-amber-400" />
                {status_breakdown.weakly_supported} Weak
              </span>
            )}
            {(status_breakdown.disputed ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-white/40">
                <AlertTriangle size={10} className="text-rose-400" />
                {status_breakdown.disputed} Disputed
              </span>
            )}
            {(status_breakdown.insufficient_evidence ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-white/40">
                <HelpCircle size={10} className="text-white/30" />
                {status_breakdown.insufficient_evidence} Unverified
              </span>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}
