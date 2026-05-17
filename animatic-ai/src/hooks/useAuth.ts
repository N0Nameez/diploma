import { useEffect, useState, useRef, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { fetchUser } from "../services/api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      userIdRef.current = u?.id ?? null;
      setUser(u);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore token refresh events — they fire on every tab visibility change
      if (event === "TOKEN_REFRESHED") return;

      const u = session?.user ?? null;
      
      // Update user state if user changed OR if metadata updated (e.g. avatar/name)
      if (userIdRef.current !== u?.id || event === "USER_UPDATED" || event === "SIGNED_IN") {
        userIdRef.current = u?.id ?? null;
        setUser(u);
        
        // If user is updated/signed in, also refresh the DB profile
        if (u) {
          refreshProfile();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      const data = await fetchUser(userIdRef.current);
      if (data) setProfile(data);
      return data;
    } catch (err) {
      console.error("Failed to refresh profile via API", err);
      // Fallback to Supabase if API is down
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userIdRef.current)
        .single();
      if (data) setProfile(data);
      return data;
    }
  }, []);

  // Listen for global profile refresh events
  useEffect(() => {
    const handleRefresh = () => refreshProfile();
    window.addEventListener('profile-refresh', handleRefresh);
    return () => window.removeEventListener('profile-refresh', handleRefresh);
  }, [refreshProfile]);

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          username: username,
          display_name: username // Set as initial display name too
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    
    // Only log in automatically if session is returned (confirmation disabled)
    if (!error && data.session && data.user) {
      userIdRef.current = data.user.id;
      setUser(data.user);
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const resendEmail = async (email: string, type: 'signup' | 'email_change' = 'signup') => {
    const { error } = await supabase.auth.resend({
      type,
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/',
      },
    });
    return { error };
  };

  return { user, profile, loading, signUp, signIn, signOut, resetPassword, updatePassword, resendEmail, signInWithOAuth, refreshProfile };
}
