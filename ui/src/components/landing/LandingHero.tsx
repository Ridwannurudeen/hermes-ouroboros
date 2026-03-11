import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import OuroborosRing from './OuroborosRing'

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Radial gradient behind hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(79,70,229,0.12)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(139,92,246,0.08)_0%,transparent_50%)]" />
      </div>

      {/* Vertical light beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-[40vh] bg-gradient-to-b from-indigo-500/40 via-indigo-500/10 to-transparent" />

      {/* Grid lines for depth */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06]"
          >
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-xs font-medium tracking-wide text-indigo-300/90">NousResearch Hackathon 2026</span>
          </motion.div>

          {/* Title */}
          <h1 className="font-display font-extrabold leading-[0.85] tracking-[-0.04em]">
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="block text-[clamp(2.8rem,7vw,6.5rem)] text-white text-glow"
            >
              The AI That Debugs
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="block text-[clamp(2.8rem,7vw,6.5rem)] gradient-text mt-2"
            >
              Its Own Brain.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-lg md:text-xl text-white/35 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Five adversarial agents debate your hardest questions.{' '}
            <span className="text-white/60 font-normal">Every disagreement becomes training data. Every cycle, the council gets sharper.</span>
            <br className="hidden md:block" />
            <span className="text-indigo-300/40">No human in the loop.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex items-center justify-center gap-4 pt-2"
          >
            <Link
              to="/app"
              className="group btn-glow flex items-center gap-2.5 px-8 py-4 text-white rounded-2xl text-base font-semibold tracking-wide"
            >
              Try the Council
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <a
              href="#how-it-works"
              className="shine px-8 py-4 rounded-2xl text-base text-white/50 font-medium border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:text-white/70 hover:border-white/10 transition-all duration-400"
            >
              Learn More
            </a>
          </motion.div>
        </motion.div>

        {/* Ouroboros ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.8, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 md:mt-24"
        >
          <OuroborosRing />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-16 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/20">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent"
          />
        </motion.div>
      </div>
    </section>
  )
}
