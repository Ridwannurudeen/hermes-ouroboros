import LandingNav from '../components/landing/LandingNav'
import LandingHero from '../components/landing/LandingHero'
import LandingDemo from '../components/landing/LandingDemo'
import VerdictGallery from '../components/landing/VerdictGallery'
import LiveStats from '../components/landing/LiveStats'
import HowItWorks from '../components/landing/HowItWorks'
import ResearchFindings from '../components/landing/ResearchFindings'
import DifferentiatorSection from '../components/landing/DifferentiatorSection'
import HermesAdvantage from '../components/landing/HermesAdvantage'
import AgentShowcase from '../components/landing/AgentShowcase'
import BenchmarkShowcase from '../components/landing/BenchmarkShowcase'
import ProofSection from '../components/landing/ProofSection'
import LearningLoop from '../components/landing/LearningLoop'
import ResultsSection from '../components/landing/ResultsSection'
import LandingFooter from '../components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06060e] dot-grid">
      {/* Static background glows (no blur filter, just opacity) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb w-[600px] h-[600px] bg-indigo-600/[0.06] top-[5%] left-[-10%]" />
        <div className="orb w-[500px] h-[500px] bg-violet-600/[0.05] top-[40%] right-[-5%]" />
        <div className="orb w-[400px] h-[400px] bg-emerald-600/[0.04] bottom-[10%] left-[20%]" />
      </div>

      <div className="relative z-10">
        <LandingNav />
        <LandingHero />

        {/* Section divider — gradient line with glow */}
        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400/60" />
        </div>

        {/* Guest Demo — zero-friction trial */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Try It Now</h2>
            <p className="text-sm text-white/40 mb-8">No signup required. 5 free queries.</p>
            <LandingDemo />
          </div>
        </section>

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400/60" />
        </div>

        {/* Example verdicts gallery */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-2">See Real Verdicts</h2>
            <p className="text-sm text-white/40 mb-10">Real queries analyzed by the 5-agent adversarial council.</p>
            <VerdictGallery />
          </div>
        </section>

        {/* Live Stats */}
        <section className="py-16 px-6">
          <LiveStats />
        </section>

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        </div>

        {/* The Proof — side-by-side solo vs council */}
        <ProofSection />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400/60" />
        </div>

        <HowItWorks />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400/60" />
        </div>

        <ResearchFindings />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400/60" />
        </div>

        <DifferentiatorSection />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
        </div>

        <HermesAdvantage />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        </div>

        <AgentShowcase />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        </div>

        <BenchmarkShowcase />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
        </div>

        <LearningLoop />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400/60" />
        </div>

        <ResultsSection />
        <LandingFooter />
      </div>
    </div>
  )
}
