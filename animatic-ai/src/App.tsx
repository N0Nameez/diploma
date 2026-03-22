import { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import HomePage from "./pages/HomePage"
import CatalogPage from "./pages/CatalogPage"
import GenerationPage from "./pages/GenerationPage"
import ProfilePage from "./pages/ProfilePage"
import Modal from "./components/Modal"
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, signUp, signIn, signOut } = useAuth()
  const [currentTheme, setTheme] = useState<'dark' | 'light'>('dark')
  const [modal, setModal] = useState<'login' | 'register' | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
  }, [currentTheme])  

  const links = [
    { label: '3D-модели', href: '/models?content=3d" '},
    { label: 'Анимации', href: '/models?content=animation'},
    { label: 'Генерация', href: '/generation'}
  ]

  return (
    <>

      <Navbar
      links={links}
      user={user}
      onLogout={signOut}
      onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      onLoginClick={() => setModal('login')}
      onRegisterClick={() => setModal('register')}/>

      <Routes>
          <Route path="/" element={<HomePage onRegisterClick={() => setModal('register')} />} />
          <Route path="/models" element={<CatalogPage/>}/>
          <Route path="/generation" element={<GenerationPage/>}/>
          <Route path="/profile" element={<ProfilePage/>}/>
      </Routes>

      {modal && (
        <Modal
          type={modal}
          onClose={() => setModal(null)}
          onSwitch={setModal}
          onSignIn={signIn}
          onSignUp={signUp}
        />
      )}
    </>
  )
}

export default App