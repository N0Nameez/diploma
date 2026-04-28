import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

interface ModalProps {
  type: "login" | "register" | "reset-password" | "update-password";
  onClose: () => void;
  onSwitch: (type: "login" | "register" | "reset-password" | "update-password") => void;
  onSignIn: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null }>;
  onSignUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: Error | null }>;
  onResetPassword?: (email: string) => Promise<{ error: Error | null }>;
  onUpdatePassword?: (password: string) => Promise<{ error: Error | null }>;
  onResendEmail?: (email: string) => Promise<{ error: Error | null }>;
  onOAuthSignIn?: (provider: "google" | "github") => Promise<{ error: Error | null }>;
}

/**
 * Authentication modal for login, registration, and password reset.
 */
export function Modal({ type, onClose, onSwitch, onSignIn, onSignUp, onUpdatePassword, onResetPassword, onResendEmail, onOAuthSignIn }: ModalProps) {
  const isLogin = type === "login";
  const isReset = type === "reset-password";
  const isUpdate = type === "update-password";
  const [isClosing, setIsClosing] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  /* Close handler with animation delay */
  function handleClose() {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  }

  /* Close when clicking overlay background (not content) */
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose();
  }

  /* Close on Escape key */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    let timer: number;
    if (resendCooldown > 0) {
      timer = window.setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleResend() {
    if (!onResendEmail || resendCooldown > 0) return;
    setLoading(true);
    const { error } = await onResendEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Письмо отправлено повторно!");
      setResendCooldown(60); // 60 seconds cooldown
    }
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isReset && onResetPassword) {
      const { error } = await onResetPassword(email);
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Письмо для сброса пароля отправлено на " + email);
      }
      return;
    }

    if (isUpdate && onUpdatePassword) {
      const { error } = await onUpdatePassword(password);
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Пароль успешно изменен!");
        setTimeout(() => handleClose(), 1500);
      }
      return;
    }

    const result = isLogin
      ? await onSignIn(email, password)
      : await onSignUp(email, password, username);

    setLoading(false);

    if (result.error) {
      const msg = result.error.message;
      if (msg.includes("Invalid login")) setError("Неверный email или пароль");
      else if (msg.includes("already registered"))
        setError("Этот email уже зарегистрирован");
      else if (msg.includes("Unable to validate email address: invalid format"))
        setError("Неверный формат почты");
      else if (msg.includes("Password should"))
        setError("Пароль должен быть не менее 6 символов");
      else setError(msg);
      return;
    }

    if (!result.error && !isLogin) {
      setIsRegistered(true);
      setResendCooldown(60); // Start cooldown immediately after first automated email
      setSuccess("Аккаунт создан! Пожалуйста, подтвердите вашу почту " + email);
    }

    if (!result.error && isLogin) {
      setTimeout(() => handleClose(), 300);
    }
  }

  if (isRegistered) {
    return (
      <div
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-[1000] 
                     bg-background-primary/60 backdrop-blur-md 
                     flex items-center justify-center
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-[440px] max-w-[95vw] 
                    bg-background-glass backdrop-blur-3xl border border-border-glass 
                    rounded-[32px] p-10 shadow-2xl
                    ${isClosing ? "animate-fade-out" : "animate-fade"}`}
        >
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-xl
                     hover:bg-accent-glow border border-border-glass
                     hover:border-accent/30
                     text-text-secondary hover:text-accent
                     flex items-center justify-center transition-all duration-200 text-xl"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            
            <h2 className="text-2xl font-bold mb-3">Подтвердите почту</h2>
            <p className="text-text-secondary mb-8 leading-relaxed">
              Мы отправили письмо на <span className="text-text-primary font-medium">{email}</span>. 
              Пожалуйста, перейдите по ссылке в письме, чтобы активировать ваш аккаунт.
            </p>

            {error && (
              <div className="w-full mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="w-full mb-6 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {success}
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
              className="w-full py-3.5 rounded-xl bg-accent text-white font-bold text-[15px]
                         hover:opacity-[0.88] hover:-translate-y-px transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? "Отправка..." : resendCooldown > 0 ? `Повторить через ${resendCooldown}с` : "Отправить письмо еще раз"}
            </button>

            <button
              onClick={() => {
                setIsRegistered(false);
                onSwitch("login");
              }}
              className="text-text-secondary text-sm hover:text-text-primary transition-colors"
            >
              Вернуться ко входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isReset) {
    return (
      <div
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-[1000]
                     bg-background-primary/60 backdrop-blur-md
                     flex items-center justify-center
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
      >
        {/* Content — stop propagation so clicking inside doesn't close */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-[440px] max-w-[95vw]
                    bg-background-glass backdrop-blur-3xl border border-border-glass
                    rounded-[32px] p-10 shadow-2xl
                    ${isClosing ? "animate-fade-out" : "animate-fade"}`}
        >
          <button
            onClick={handleClose}
            className={`absolute top-6 right-6 w-10 h-10 rounded-xl
                     hover:bg-accent-glow border border-border-glass
                     hover:border-accent/30
                     text-text-secondary hover:text-accent
                     flex items-center justify-center transition-all duration-200 text-xl
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="font-extrabold text-xl text-accent mb-1">
            AnimaticAI
          </div>
          <div className="font-bold text-2xl tracking-tight mb-1">
            Сброс пароля
          </div>
          <div className="text-sm text-text-secondary font-light mb-7">
            Введи email — отправим ссылку для сброса
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.8px]">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl
                         text-text-primary text-sm outline-none focus:border-accent transition-all duration-200
                         placeholder:text-text-muted  hover:border-accent/40"
            />
          </div>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
                            text-red-400 text-sm"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20
                            text-green-400 text-sm"
            >
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl
                       bg-accent text-white font-bold text-[15px]
                       hover:opacity-[0.88] hover:-translate-y-px
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Отправка..." : "Отправить ссылку"}
          </button>

          <div className="text-center mt-5 text-sm text-text-secondary">
            Вспомнил пароль?{" "}
            <button
              onClick={() => onSwitch("login")}
              className="text-accent font-medium hover:underline"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isUpdate) {
    return (
      <div
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-[1000]
                     bg-background-primary/60 backdrop-blur-md
                     flex items-center justify-center
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-[440px] max-w-[95vw]
                    bg-background-glass backdrop-blur-3xl border border-border-glass
                    rounded-[32px] p-10 shadow-2xl
                    ${isClosing ? "animate-fade-out" : "animate-fade"}`}
        >
          <button
            onClick={handleClose}
            className={`absolute top-6 right-6 w-10 h-10 rounded-xl
                     hover:bg-accent-glow border border-border-glass
                     hover:border-accent/30
                     text-text-secondary hover:text-accent
                     flex items-center justify-center transition-all duration-200 text-xl
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="font-extrabold text-xl text-accent mb-1">
            AnimaticAI
          </div>
          <div className="font-bold text-2xl tracking-tight mb-1">
            Новый пароль
          </div>
          <div className="text-sm text-text-secondary font-light mb-7">
            Придумай сложный пароль
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.8px]">
              Новый пароль
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl
                         text-text-primary text-sm outline-none focus:border-accent transition-all duration-200
                         placeholder:text-text-muted  hover:border-accent/40"
            />
          </div>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
                            text-red-400 text-sm"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20
                            text-green-400 text-sm"
            >
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl
                       bg-accent text-white font-bold text-[15px]
                       hover:opacity-[0.88] hover:-translate-y-px
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Сохранение..." : "Сменить пароль"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-[1000]
                   bg-background-primary/60 backdrop-blur-md
                   flex items-center justify-center
                   ${isClosing ? "animate-fade-out" : "animate-fade"}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-[440px] max-w-[95vw]
                    bg-background-glass backdrop-blur-3xl border border-border-glass
                    rounded-[32px] p-10 shadow-2xl
                    ${isClosing ? "animate-fade-out" : "animate-fade"}`}
      >
        <button
          onClick={handleClose}
          className={`absolute top-6 right-6 w-10 h-10 rounded-xl
                      hover:bg-accent-glow border border-border-glass
                     hover:border-accent/30
                     text-text-secondary hover:text-accent
                     flex items-center justify-center transition-all duration-200 text-xl
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="font-extrabold text-xl text-accent mb-1">
          AnimaticAI
        </div>
        <div className="font-bold text-2xl tracking-tight mb-1">
          {isLogin ? "Добро пожаловать" : "Создать аккаунт"}
        </div>
        <div className="text-sm text-text-secondary font-light mb-7">
          {isLogin
            ? "Войди чтобы продолжить"
            : "Начни создавать 3D-модели бесплатно"}
        </div>

        {!isLogin && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.8px]">
              Имя пользователя
            </label>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl
                         text-text-primary text-sm outline-none focus:border-accent transition-all duration-200
                         placeholder:text-text-muted  hover:border-accent/40"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.8px]">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl
                       text-text-primary text-sm outline-none focus:border-accent transition-all duration-200
                       placeholder:text-text-muted  hover:border-accent/40"
          />
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.8px]">
            Пароль
          </label>
          <input
            type="password"
            placeholder={isLogin ? "••••••••" : "Минимум 6 символов"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl
                       text-text-primary text-sm outline-none focus:border-accent transition-all duration-200
                       placeholder:text-text-muted hover:border-accent/40"
          />
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
                          text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20
                          text-green-400 text-sm"
          >
            {success}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 mt-2 rounded-xl
                     bg-accent text-white font-bold text-[15px]
                     hover:opacity-[0.88] hover:-translate-y-px
                     transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Загрузка..." : isLogin ? "Войти" : "Создать аккаунт"}
        </button>

        {(isLogin || type === "register") && onOAuthSignIn && (
          <>
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 border-t border-border-glass"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                Или через
              </span>
              <div className="flex-1 border-t border-border-glass"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onOAuthSignIn("google")}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                         bg-white/5 border border-border-glass hover:bg-white/10
                         transition-all duration-200 text-sm font-medium"
              >
                <FcGoogle className="w-5 h-5" />
                Google
              </button>
              <button
                onClick={() => onOAuthSignIn("github")}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                         bg-white/5 border border-border-glass hover:bg-white/10
                         transition-all duration-200 text-sm font-medium"
              >
                <FaGithub className="w-5 h-5" />
                GitHub
              </button>
            </div>
          </>
        )}

        {isLogin && (
          <div className="text-center mt-3 text-sm text-text-secondary">
            <button
              onClick={() => onSwitch("reset-password")}
              className="text-accent font-medium hover:underline"
            >
              Забыли пароль?
            </button>
          </div>
        )}

        <div className="text-center mt-5 text-sm text-text-secondary">
          {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
          <button
            onClick={() => onSwitch(isLogin ? "register" : "login")}
            className="text-accent font-medium hover:underline"
          >
            {isLogin ? "Зарегистрироваться" : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

