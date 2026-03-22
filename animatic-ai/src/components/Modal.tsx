import { useState, useEffect } from 'react'
import InputField from './InputFields'

interface ModalProps {
  type: 'login' | 'register'
  onClose: () => void
  onSwitch: (type: 'login' | 'register') => void
  onSignIn: (email: string, password: string) => Promise<{ error: any }>
  onSignUp: (email: string, password: string, username: string) => Promise<{ error: any }>
}

function Modal({ type, onClose, onSwitch, onSignIn, onSignUp }: ModalProps) {
  const isLogin = type === 'login'
  const [isClosing, setIsClosing] = useState(false)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose()
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    const result = isLogin
      ? await onSignIn(email, password)
      : await onSignUp(email, password, username)

    setLoading(false)

    if (result.error) {
      const msg = result.error.message
      if (msg.includes('Invalid login')) setError('Неверный email или пароль')
      else if (msg.includes('already registered')) setError('Этот email уже зарегистрирован')
      else if (msg.includes('Unable to validate email address: invalid format')) setError('Неверный формат почты')
      else if (msg.includes('Password should')) setError('Пароль должен быть не менее 6 символов')
      else setError(msg)
      return
    }
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
      <div className={`relative w-[440px] max-w-[95vw]
                      bg-surface border border-border
                      rounded-3xl p-10
                      ${isClosing ? 'animate-fade-out' : 'animate-fade'}`}>

        {/* Close button */}
        <button onClick={handleClose}
          className={`absolute top-5 right-5 w-8 h-8 rounded-lg
                     bg-surface2 border border-border
                     text-textSecondary hover:text-text
                     flex items-center justify-center transition-all text-lg
                     ${isClosing ? 'animate-fade-out' : 'animate-fade'}`}>
          ×
        </button>

        {/* Header */}
        <div className="font-extrabold text-xl text-accent mb-1">AnimaticAI</div>
        <div className="font-bold text-2xl tracking-tight mb-1">
          {isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}
        </div>
        <div className="text-sm text-textSecondary font-light mb-7">
          {isLogin ? 'Войди чтобы продолжить' : 'Начни создавать 3D-модели бесплатно'}
        </div>

        {/* Input Fields */}
        {!isLogin && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
              Имя пользователя
            </label>
            <InputField
              type="text"
              placeholder="username"
              value={username}
              onChange={setUsername}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl
                       text-text text-sm outline-none focus:border-accent transition-all
                       placeholder:text-textSecondary"
          />
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
            Пароль
          </label>
          <input
            type="password"
            placeholder={isLogin ? '••••••••' : 'Минимум 6 символов'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl
                       text-text text-sm outline-none focus:border-accent transition-all
                       placeholder:text-textSecondary"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
                          text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 mt-2 rounded-xl
                     bg-accent text-white font-bold text-[15px]
                     hover:opacity-[0.88] hover:-translate-y-px
                     transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Создать аккаунт'}
        </button>

        {/* Auth/Reg switch button */}
        <div className="text-center mt-5 text-sm text-textSecondary">
          {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button
            onClick={() => onSwitch(isLogin ? 'register' : 'login')}
            className="text-accent font-medium hover:underline">
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal