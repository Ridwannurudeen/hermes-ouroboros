import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { Activity, GitBranch, Cpu, TrendingUp, ShieldCheck } from 'lucide-react'

interface StatItem {
  label: string
  value: number
  suffix?: string
  icon: typeof Activity
  color: string
}

function CountUp({ target, suffix }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(motionVal, target, { duration: 1.5, ease: 'easeOut' })
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => { controls.stop(); unsub() }
  }, [inView, target, motionVal, rounded])

  return <span ref={ref}>{display}{suffix || ''}</span>
}

export default function LiveStats() {
  const [stats, setStats] = useState<StatItem[] | null>(null)

  useEffect(() => {
    fetch('/api/loop/status')
      .then((r) => {
        if (!r.ok) throw new Error('fail')
        return r.json()
      })
      .then((data) => {
        const items: StatItem[] = []
        if (data.sessions?.total != null) {
          items.push({ label: 'Sessions Analyzed', value: data.sessions.total, icon: Activity, color: 'text-cyan-400' })
        }
        if (data.dpo?.total_pairs != null) {
          items.push({ label: 'DPO Training Pairs', value: data.dpo.total_pairs, icon: GitBranch, color: 'text-violet-400' })
        }
        if (data.model_history?.length != null) {
          items.push({ label: 'Model Versions', value: data.model_history.length, icon: Cpu, color: 'text-emerald-400' })
        }
        if (data.sessions?.average_confidence != null) {
          items.push({ label: 'Avg Confidence', value: Math.round(data.sessions.average_confidence), suffix: '%', icon: TrendingUp, color: 'text-amber-400' })
        }
        // Also fetch claim ledger stats
        fetch('/api/claims/ledger')
          .then((r) => r.ok ? r.json() : null)
          .then((ledger) => {
            if (ledger && ledger.total_claims > 0) {
              items.push({ label: 'Claims Verified', value: ledger.total_claims, icon: ShieldCheck, color: 'text-rose-400' })
            }
            if (items.length > 0) setStats(items)
          })
          .catch(() => { if (items.length > 0) setStats(items) })
      })
      .catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5 text-center"
          >
            <Icon size={14} className={`${stat.color} opacity-50 mx-auto mb-3`} />
            <p className="text-2xl font-black font-mono text-white/90 mb-1">
              <CountUp target={stat.value} suffix={stat.suffix} />
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/25">{stat.label}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
