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
import { LoadingScreen } from "./components/LoadingScreen/LoadingScreen";

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
    <SearchProvider>
      <LoadingScreen />
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
  );
}

