import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import OuroborosRing from './OuroborosRing'

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full"
          >
            <Sparkles size={14} className="text-brand-400" />
            <span className="text-xs text-brand-400 font-medium">NousResearch Hackathon</span>
          </motion.div>

          {/* Title */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tight">
            <span className="text-white">Five Minds.</span>
            <br />
            <span className="gradient-text">One Verdict.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            A multi-agent AI council that debates your hardest questions — then teaches itself to be better.
            Powered by Hermes and DPO self-improvement.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/app"
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-500 to-violet-500 text-white rounded-2xl text-base font-medium
                hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all duration-500"
            >
              Try the Council
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-white/5 border border-white/10 text-white/70 rounded-2xl text-base hover:bg-white/10 transition-colors"
            >
              Learn More
            </a>
          </div>
        </motion.div>

        {/* Ouroboros ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-16"
        >
          <OuroborosRing />
        </motion.div>
      </div>
    </section>
  )
}
