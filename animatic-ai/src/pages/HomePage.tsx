import Hero from "../components/home/Hero"
import Categories from "../components/home/Categories"

interface HomePageProps{
    onRegisterClick: () => void
}

function HomePage({ onRegisterClick }: HomePageProps) {
  return (
    <main>
      <Hero onRegisterClick={onRegisterClick} />
      <Categories/>
    </main>
  )
}

export default HomePage