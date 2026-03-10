import LandingNav from '../components/landing/LandingNav'
import LandingHero from '../components/landing/LandingHero'
import HowItWorks from '../components/landing/HowItWorks'
import AgentShowcase from '../components/landing/AgentShowcase'
import LearningLoop from '../components/landing/LearningLoop'
import ResultsSection from '../components/landing/ResultsSection'
import LandingFooter from '../components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-bg">
      <LandingNav />
      <LandingHero />
      <HowItWorks />
      <AgentShowcase />
      <LearningLoop />
      <ResultsSection />
      <LandingFooter />
    </div>
  )
}
