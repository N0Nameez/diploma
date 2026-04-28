import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AuthGuardProps {
  children: ReactNode;
  onAccessDenied?: () => void;
}

/**
 * Higher-order component that protects routes from unauthorized access.
 * If the user is not authenticated, they are redirected to the homepage.
 */
export function AuthGuard({ children, onAccessDenied }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (onAccessDenied) {
      onAccessDenied();
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
