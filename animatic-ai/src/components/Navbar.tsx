import { useState, useEffect } from 'react';
import { Button } from "@/components/Button";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Moon, Sun, LogOut, User as UserIcon } from "lucide-react";

interface NavbarProps {
  links: { label: string; href: string }[];
  user: User | null;
  onThemeToggle: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
}

/**
 * Navbar component providing navigation links, theme toggle, and user authentication actions.
 */
export function Navbar({
  links,
  user,
  onThemeToggle,
  onLoginClick,
  onRegisterClick,
  onLogout,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        className={`mx-auto transition-all duration-500 flex items-center justify-between px-6 lg:px-8 ${
          scrolled
            ? 'bg-background-surface/80 backdrop-blur-xl border border-border rounded-2xl shadow-lg max-w-[1200px] h-14'
            : 'bg-transparent max-w-[1400px] h-20 border-transparent'
        }`}
      >
        {/* Logo */}
        <div className="flex-none">
          <Link to="/" className="font-tight font-bold text-xl lg:text-2xl flex items-center gap-1 tracking-tight no-underline bg-clip-text text-transparent bg-gradient-to-r from-[#EC4899] to-[#7C3AED]">
              AnimaticAI
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden lg:flex flex-1 justify-center">
          <div className="flex gap-8 items-center">
            {links.map((link) => (
              <Button key={link.href} label={link.label} href={link.href} variant="link" />
            ))}
          </div>
        </div>

        {/* Right Section (Desktop) */}
        <div className="hidden lg:flex flex-none items-center gap-4">
          <button
            onClick={onThemeToggle}
            className="w-9 h-9 border border-border rounded-[10px] flex items-center justify-center transition-all duration-200 text-text-secondary hover:bg-background-surface hover:text-accent hover:border-accent"
          >
            <Sun size={16} className="hidden dark:block" />
            <Moon size={16} className="block dark:hidden" />
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-background-secondary border border-border hover:border-accent transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-text-primary max-w-[100px] truncate">
                  {user.user_metadata?.username ?? user.email}
                </span>
              </Link>
              <button
                onClick={onLogout}
                className="text-sm text-text-secondary hover:text-accent transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <>
              <Button label="Войти" variant="ghost" onClick={onLoginClick} />
              <Button label="Регистрация" variant="primary" onClick={onRegisterClick} />
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden items-center gap-3">
          <button
            onClick={onThemeToggle}
            className="w-9 h-9 border border-border rounded-[10px] flex items-center justify-center text-text-secondary"
          >
            <Sun size={18} className="hidden dark:block" />
            <Moon size={18} className="block dark:hidden" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-text-primary focus:outline-none"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-4 right-4 mt-2 p-6 bg-background-secondary/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl lg:hidden flex flex-col gap-6"
          >
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium text-text-secondary hover:text-accent transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="h-px bg-border w-full" />

            <div className="flex flex-col gap-4">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background-surface border border-border"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-text-primary">Профиль</span>
                      <span className="text-xs text-text-muted">{user.email}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-text-secondary hover:text-accent p-2"
                  >
                    <LogOut size={20} /> Выйти
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button label="Войти" variant="ghost" onClick={onLoginClick} className="w-full h-12" />
                  <Button label="Регистрация" variant="primary" onClick={onRegisterClick} className="w-full h-12" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}


