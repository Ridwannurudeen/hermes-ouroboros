import LandingNav from '../components/landing/LandingNav'
import LandingHero from '../components/landing/LandingHero'
import HowItWorks from '../components/landing/HowItWorks'
import AgentShowcase from '../components/landing/AgentShowcase'
import LearningLoop from '../components/landing/LearningLoop'
import ResultsSection from '../components/landing/ResultsSection'
import LandingFooter from '../components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06060e] noise dot-grid">
      {/* Floating background orbs */}
      <div className="orb w-[600px] h-[600px] bg-indigo-600/[0.07] top-[10%] left-[-10%]" />
      <div className="orb w-[500px] h-[500px] bg-violet-600/[0.06] top-[30%] right-[-5%]" style={{ animationDelay: '2s' }} />
      <div className="orb w-[400px] h-[400px] bg-emerald-600/[0.05] bottom-[20%] left-[20%]" style={{ animationDelay: '4s' }} />

      <div className="relative z-10">
        <LandingNav />
        <LandingHero />

        {/* Divider glow line */}
        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        </div>

        <HowItWorks />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        </div>

        <AgentShowcase />
        <LearningLoop />

        <div className="relative h-px mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        </div>

        <ResultsSection />
        <LandingFooter />
      </div>
    </div>
  )
}
