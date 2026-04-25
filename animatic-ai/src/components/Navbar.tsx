import { useState, useEffect } from 'react';
import Button from "./Button";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { SearchInput } from "./SearchAutocomplete";

interface NavbarProps {
  links: { label: string; href: string }[];
  user: User | null;
  onThemeToggle: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
}

function Navbar({
  links,
  user,
  onThemeToggle,
  onLoginClick,
  onRegisterClick,
  onLogout,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed z-50 transition-all duration-500 ${
        scrolled ? 'top-4 left-4 right-4' : 'top-0 left-0 right-0'
      }`}
    >
      <div
        className={`mx-auto transition-all duration-500 flex items-center justify-between px-6 lg:px-8${
          scrolled
            ? 'bg-background-surface backdrop-blur-xl border border-border rounded-2xl shadow-lg max-w-[1200px] h-14'
            : 'bg-transparent max-w-[1400px] h-20 border-transparent'
        }`}
      >
        {/* Left part */}
        <div className="flex-1 flex justify-start">
          <Link to="/" className="font-tight font-bold text-2xl text-text-primary flex items-center gap-1 tracking-tight no-underline">
            AnimaticAI
          </Link>
        </div>

        {/* Middle part */}
        <div className="flex-1 flex justify-center">
          <div className="flex gap-10 items-center">
            {links.map((link) => (
              <Button key={link.href} label={link.label} href={link.href} variant="link" />
            ))}
          </div>
        </div>

        {/* Right part */}
        <div className="flex-1 flex justify-end">
          {user ? (
            <div className="ml-auto flex items-center gap-5">
              <button
                onClick={onThemeToggle}
                className="w-9 h-9 bg-surface2 border border-border
                    rounded-[10px] cursor-pointer flex items-center justify-center transition-all duration-200
                    text-textSecondary hover:bg-surface hover:text-accent"
              >
                {
                  <svg
                    id="themeIcon"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                }
              </button>
              <Link
                to="/profile"
                className="flex items-center gap-2
                                px-3 py-1.5 rounded-[10px] bg-surface2 border border-border
                                hover:border-accent transition-all duration-200"
              >
                <div
                  className="w-6 h-6 rounded-full bg-accent
                                    flex items-center justify-center
                                    text-white text-xs font-bold"
                >
                  {user.email?.[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-text max-w-[120px] truncate">
                  {user.user_metadata?.username ?? user.email}
                </span>
              </Link>
              <button
                onClick={onLogout}
                className="text-sm text-textSecondary hover:text-text transition-colors duration-200"
              >
                Выйти
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-5">
              <button
                onClick={onThemeToggle}
                className="w-9 h-9 bg-surface2 border border-border
                        rounded-[10px] cursor-pointer flex items-center justify-center transition-all duration-200
                        text-textSecondary hover:bg-surface hover:text-accent"
              >
                {
                  <svg
                    id="themeIcon"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                }
              </button>
              <Button label="Войти" variant="ghost" onClick={onLoginClick} />
              <Button
                label="Регистрация"
                variant="primary"
                onClick={onRegisterClick}
              />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
