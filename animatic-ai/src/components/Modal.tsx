import { useState, useEffect } from 'react'
import InputField from './InputFields'

interface ModalProps {
  type: 'login' | 'register'
  onClose: () => void
  onSwitch: (type: 'login' | 'register') => void
}

function Modal({ type, onClose, onSwitch }: ModalProps) {
  const isLogin = type === 'login'
  const [isClosing, setIsClosing] = useState(false)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose()
  }

  function handleSubmit() {
    console.log(isLogin ? 'Логин:' : 'Регистрация:', { email, password, username })
    handleClose()
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
    }, [])

  return (
    <div
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-[1000] 
                 bg-black/70 backdrop-blur-sm
                 flex items-center justify-center
                 ${isClosing ? 'animate-fade-out' : 'animate-fade'}`}
    >
      {/* Modal card */}
      <div className={`relative w-[440px] max-w-[95vw]
                      bg-surface border border-border
                      rounded-3xl p-10
                      ${isClosing ? 'animate-fade-out' : 'animate-fade'}`}>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg
                     bg-surface2 border border-border
                     text-textSecondary hover:text-text
                     flex items-center justify-center transition-all text-lg"
        >
          ×
        </button>

        {/* Header */}
        <div className="font-extrabold text-xl 
                        text-accent mb-1">
          AnimaticAI
        </div>
        <div className="font-bold text-2xl 
                        tracking-tight mb-1">
          {isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}
        </div>
        <div className="text-sm text-textSecondary
                        font-light mb-7">
          {isLogin
            ? 'Войди, чтобы продолжить создавать'
            : 'Начни создавать 3D-модели бесплатно'}
        </div>

        {/* Form input fields */}
        {!isLogin && (
          <InputField
            label="Имя пользователя"
            type="text"
            placeholder="username"
            value={username}
            onChange={setUsername}
          />
        )}
        <InputField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
        />
        <InputField
          label="Пароль"
          type="password"
          placeholder={isLogin ? '••••••••' : 'Минимум 8 символов'}
          value={password}
          onChange={setPassword}
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          className="w-full py-3.5 mt-2 rounded-xl
                     bg-accent text-white font-bold text-[15px]
                     shadow-accentGlow
                     hover:opacity-[0.88] hover:-translate-y-px
                     transition-all"
        >
          {isLogin ? 'Войти' : 'Создать аккаунт'}
        </button>

        {/* Separator */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-textSecondary">или</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google button */}
        <button className="w-full py-3 rounded-xl
                           bg-surface border border-border
                           text-text text-sm font-medium
                           flex items-center justify-center gap-2.5
                           hover:border-accent transition-all">
          {/* Google SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Войти через Google
        </button>

        {/* Form switch */}
        <div className="text-center mt-5 text-sm text-textSecondary">
          {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button
            onClick={() => onSwitch(isLogin ? 'register' : 'login')}
            className="text-accent font-medium hover:underline"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal