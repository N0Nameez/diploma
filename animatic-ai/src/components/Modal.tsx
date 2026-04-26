import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface ModalProps {
  type: "login" | "register" | "reset-password";
  onClose: () => void;
  onSwitch: (type: "login" | "register" | "reset-password") => void;
  onSignIn: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null }>;
  onSignUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: Error | null }>;
}

/**
 * Authentication modal for login, registration, and password reset.
 */
export function Modal({ type, onClose, onSwitch, onSignIn, onSignUp }: ModalProps) {
  const isLogin = type === "login";
  const isReset = type === "reset-password";
  const [isClosing, setIsClosing] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/profile",
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Письмо для сброса пароля отправлено на " + email);
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
      setSuccess("Аккаунт создан! Проверьте почту для подтверждения.");
      setTimeout(() => handleClose(), 1500);
    }

    if (!result.error && isLogin) {
      setTimeout(() => handleClose(), 300);
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isReset) {
    return (
      <div
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-[1000]
                     bg-black/70 backdrop-blur-[2px]
                     flex items-center justify-center
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
      >
        {/* Content — stop propagation so clicking inside doesn't close */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-[440px] max-w-[95vw]
                      bg-surface border border-border
                      rounded-3xl p-10
                      ${isClosing ? "animate-fade-out" : "animate-fade"}`}
        >
          <button
            onClick={handleClose}
            className={`absolute top-5 right-5 w-8 h-8 rounded-lg
                       bg-surface2 border border-border
                       text-textSecondary hover:text-text
                       flex items-center justify-center transition-all duration-200 text-lg
                       ${isClosing ? "animate-fade-out" : "animate-fade"}`}
          >
            ×
          </button>

          <div className="font-extrabold text-xl text-accent mb-1">
            AnimaticAI
          </div>
          <div className="font-bold text-2xl tracking-tight mb-1">
            Сброс пароля
          </div>
          <div className="text-sm text-textSecondary font-light mb-7">
            Введи email — отправим ссылку для сброса
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl
                         text-text text-sm outline-none focus:border-accent transition-all duration-200
                         placeholder:text-textSecondary"
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

          <div className="text-center mt-5 text-sm text-textSecondary">
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

  return (
    <div
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-[1000]
                     bg-black/70 backdrop-blur-[2px]
                     flex items-center justify-center
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
    >
      {/* Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-[440px] max-w-[95vw]
                      bg-surface border border-border
                      rounded-3xl p-10
                      ${isClosing ? "animate-fade-out" : "animate-fade"}`}
      >
        <button
          onClick={handleClose}
          className={`absolute top-5 right-5 w-8 h-8 rounded-lg
                     bg-surface2 border border-border
                     text-textSecondary hover:text-text
                     flex items-center justify-center transition-all duration-200 text-lg
                     ${isClosing ? "animate-fade-out" : "animate-fade"}`}
        >
          ×
        </button>

        <div className="font-extrabold text-xl text-accent mb-1">
          AnimaticAI
        </div>
        <div className="font-bold text-2xl tracking-tight mb-1">
          {isLogin ? "Добро пожаловать" : "Создать аккаунт"}
        </div>
        <div className="text-sm text-textSecondary font-light mb-7">
          {isLogin
            ? "Войди чтобы продолжить"
            : "Начни создавать 3D-модели бесплатно"}
        </div>

        {!isLogin && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
              Имя пользователя
            </label>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl
                         text-text text-sm outline-none focus:border-accent transition-all duration-200
                         placeholder:text-textSecondary"
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
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl
                       text-text text-sm outline-none focus:border-accent transition-all duration-200
                       placeholder:text-textSecondary"
          />
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-[11px] font-bold text-textSecondary uppercase tracking-[0.8px]">
            Пароль
          </label>
          <input
            type="password"
            placeholder={isLogin ? "••••••••" : "Минимум 6 символов"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl
                       text-text text-sm outline-none focus:border-accent transition-all duration-200
                       placeholder:text-textSecondary"
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

        {isLogin && (
          <div className="text-center mt-3 text-sm text-textSecondary">
            <button
              onClick={() => onSwitch("reset-password")}
              className="text-accent font-medium hover:underline"
            >
              Забыли пароль?
            </button>
          </div>
        )}

        <div className="text-center mt-5 text-sm text-textSecondary">
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

