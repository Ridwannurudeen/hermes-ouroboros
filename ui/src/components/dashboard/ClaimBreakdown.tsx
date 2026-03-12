import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ClaimItem } from '../../api/types'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  supported: {
    label: 'SUPPORTED',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  weakly_supported: {
    label: 'WEAK',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  disputed: {
    label: 'DISPUTED',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  insufficient_evidence: {
    label: 'UNVERIFIED',
    color: 'text-white/40',
    bg: 'bg-white/[0.05]',
    border: 'border-white/[0.1]',
  },
}

interface ClaimBreakdownProps {
  claims: ClaimItem[]
}

export default function ClaimBreakdown({ claims }: ClaimBreakdownProps) {
  const [expanded, setExpanded] = useState<number | null>(null)

  if (!claims || claims.length === 0) return null

  const counts = claims.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Claim Breakdown
        </h3>
        <div className="flex gap-2">
          {Object.entries(counts).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.insufficient_evidence
            return (
              <span
                key={status}
                className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} ${cfg.border} border`}
              >
                {count} {cfg.label}
              </span>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        {claims.map((claim, i) => {
          const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.insufficient_evidence
          const isExpanded = expanded === i

          return (
            <motion.div
              key={i}
              layout
              className={`rounded-lg border ${cfg.border} ${cfg.bg} overflow-hidden cursor-pointer`}
              onClick={() => setExpanded(isExpanded ? null : i)}
            >
              <div className="flex items-start gap-3 p-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} shrink-0 mt-0.5`}>
                  {cfg.label}
                </span>
                <p className="text-sm text-white/70 leading-relaxed flex-1">
                  {claim.claim}
                </p>
                <span className="text-white/20 text-xs shrink-0">
                  {isExpanded ? '\u25B4' : '\u25BE'}
                </span>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-0 border-t border-white/[0.06] mt-0 space-y-2">
                      {/* Evidence For */}
                      {claim.evidence_for && claim.evidence_for.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-wider mb-1">Evidence For</p>
                          <ul className="space-y-0.5">
                            {claim.evidence_for.map((e, j) => (
                              <li key={j} className="text-xs text-white/50 leading-relaxed pl-3 relative before:content-['+'] before:absolute before:left-0 before:text-emerald-400/50 before:text-[10px]">
                                {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Evidence Against */}
                      {claim.evidence_against && claim.evidence_against.length > 0 && (
                        <div>
                          <p className="text-[10px] text-rose-400/70 font-medium uppercase tracking-wider mb-1">Evidence Against</p>
                          <ul className="space-y-0.5">
                            {claim.evidence_against.map((e, j) => (
                              <li key={j} className="text-xs text-white/50 leading-relaxed pl-3 relative before:content-['\2212'] before:absolute before:left-0 before:text-rose-400/50 before:text-[10px]">
                                {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Uncertainty bar */}
                      {claim.uncertainty !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30 shrink-0">Uncertainty</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-violet-500/60 transition-all"
                              style={{ width: `${claim.uncertainty}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-white/30 tabular-nums">{claim.uncertainty}%</span>
                        </div>
                      )}
                      {/* Fallback reasoning (shown for regex-extracted claims) */}
                      {!claim.structured && claim.reasoning && (
                        <p className="text-xs text-white/50 mt-1 leading-relaxed">
                          {claim.reasoning}
                        </p>
                      )}
                      {claim.source_url && (
                        <a
                          href={claim.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <span>Source</span>
                          <span className="text-white/20">{'\u2192'}</span>
                          <span className="text-white/30 truncate max-w-[200px]">
                            {(() => { try { return new URL(claim.source_url).hostname } catch { return claim.source_url } })()}
                          </span>
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
