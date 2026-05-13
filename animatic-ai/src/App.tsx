import { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { CatalogPage } from "./pages/CatalogPage";
import { GenerationPage } from "./pages/GenerationPage";
import { ProfilePage } from "./pages/ProfilePage";
import { Modal } from "./components/Modal";
import { ModelPage } from "./pages/ModelPage";
import { AnimationPage } from "./pages/AnimationPage";
import { PricingPage } from "./pages/PricingPage";
import { useAuth } from "./hooks/useAuth";
import { SearchProvider, SearchModal } from "./components/SearchAutocomplete";
import { supabase } from "./lib/supabase";
import { AuthGuard } from "./components/AuthGuard/AuthGuard";
import { ScrollToTop } from "./components/ScrollToTop";
import { GenerationProvider } from "./contexts/GenerationContext";
import { Toaster } from "react-hot-toast";

/**
 * Root Application component handling routing, global state, and layout.
 */
export function App() {
  const { user, profile, signUp, signIn, signOut, updatePassword, resetPassword, resendEmail, signInWithOAuth } = useAuth();
  const location = useLocation();
  const [currentTheme, setTheme] = useState<"dark" | "light">(() => {
    // Sync with index.html script
    const attr = document.documentElement.getAttribute("data-theme") as "dark" | "light";
    return attr || "dark";
  });
  const [modal, setModal] = useState<
    "login" | "register" | "reset-password" | "update-password" | null
  >(null);

  const isCatalog = location.pathname.startsWith("/models") || location.pathname.startsWith("/animations");

  useEffect(() => {
    localStorage.setItem("theme", currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setModal("update-password");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const links = [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: "/models" },
    { label: "Генерация", href: "/generation" },
    { label: "Тарифы", href: "/pricing" },
  ];

  return (
    <GenerationProvider>
      <SearchProvider>
        <Toaster 
          position="bottom-center" 
          containerStyle={{ bottom: 28 }}
          toastOptions={{
            duration: 2800,
          }}
        >
          {(t) => (
            <div
              className={`px-5 py-3 font-medium text-sm rounded-xl border flex items-center gap-2 shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-300 ${
                t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              } ${
                t.type === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-background-surface border-border text-text-primary"
              }`}
            >
              <span className={t.type === "error" ? "text-red-500" : "text-accent"}>
                {t.type === "error" ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </span>
              <span>{String(t.message)}</span>
            </div>
          )}
        </Toaster>
        <ScrollToTop />
        <Navbar
          links={links}
          user={user}
          profile={profile}
          onLogout={signOut}
          onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          onLoginClick={() => setModal("login")}
          onRegisterClick={() => setModal("register")}
          fullWidth={isCatalog}
        />

        <SearchModal />

        <Routes>
          <Route
            path="/"
            element={<HomePage onRegisterClick={() => setModal("register")} user={user} />}
          />
          <Route path="/models" element={<CatalogPage />} />
          <Route path="/models/:id" element={<ModelPage />} />
          <Route path="/animations/:id" element={<AnimationPage />} />
          <Route path="/pricing" element={<PricingPage onAuthClick={() => setModal("login")} />} />
          <Route 
            path="/generation" 
            element={
              <AuthGuard onAccessDenied={() => setModal("login")}>
                <GenerationPage />
              </AuthGuard>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <AuthGuard onAccessDenied={() => setModal("login")}>
                <ProfilePage />
              </AuthGuard>
            } 
          />
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>

        {modal && (
          <Modal
            type={modal}
            onClose={() => setModal(null)}
            onSwitch={(t) => setModal(t)}
            onSignIn={signIn}
            onSignUp={signUp}
            onUpdatePassword={updatePassword}
            onResetPassword={resetPassword}
            onResendEmail={resendEmail}
            onOAuthSignIn={signInWithOAuth}
          />
        )}
      </SearchProvider>
    </GenerationProvider>
  );
}
