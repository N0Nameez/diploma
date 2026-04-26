import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { CatalogPage } from "./pages/CatalogPage";
import { GenerationPage } from "./pages/GenerationPage";
import { ProfilePage } from "./pages/ProfilePage";
import { Modal } from "./components/Modal";
import { ModelPage } from "./pages/ModelPage";
import { AnimationPage } from "./pages/AnimationPage";
import { useAuth } from "./hooks/useAuth";
import { SearchProvider, SearchModal } from "./components/SearchAutocomplete";

/**
 * Root Application component handling routing, global state, and layout.
 */
export function App() {
  const { user, signUp, signIn, signOut } = useAuth();
  const [currentTheme, setTheme] = useState<"dark" | "light">("dark");
  const [modal, setModal] = useState<
    "login" | "register" | "reset-password" | null
  >(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  const links = [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: "/models" },
    { label: "Генерация", href: "/generation" },
  ];

  return (
    <SearchProvider>
      <Navbar
        links={links}
        user={user}
        onLogout={signOut}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onLoginClick={() => setModal("login")}
        onRegisterClick={() => setModal("register")}
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
        <Route path="/generation" element={<GenerationPage />} />
        <Route path="/profile" element={<ProfilePage />} />
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
    </SearchProvider>
  );
}

