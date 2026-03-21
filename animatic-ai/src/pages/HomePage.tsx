import Hero from "../components/home/Hero"
import CategoriesSection from "../components/home/CategoriesSection"
import ModelsSection from "../components/home/ModelSection"
import FeaturesSection from "../components/home/FeaturesSection"
import CTABanner  from "../components/home/CTABanner"
import Footer from '../components/Footer'

interface HomePageProps{
    onRegisterClick: () => void
}

function HomePage({ onRegisterClick }: HomePageProps) {
  return (
    <main>
      <Hero onRegisterClick={onRegisterClick} />
      <div className="h-px"
           style={{ background: 'linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent)', opacity: 0.3 }} />
      <CategoriesSection/>
      <div className="h-px"
           style={{ background: 'linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent)', opacity: 0.3 }} />
      <ModelsSection />
      <div className="h-px"
           style={{ background: 'linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent)', opacity: 0.3 }} />
      <FeaturesSection/>

      <CTABanner onRegisterClick={onRegisterClick} />
      
      <Footer />
    </main>
  )
}

export default HomePage