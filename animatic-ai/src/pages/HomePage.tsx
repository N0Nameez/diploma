import Hero from "../components/home/Hero"

interface HomePageProps{
    onRegisterClick: () => void
}

function HomePage({ onRegisterClick }: HomePageProps) {
  return (
    <main>
      <Hero onRegisterClick={onRegisterClick} />
    </main>
  )
}

export default HomePage