import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "./types";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: "active" | "inactive" | "blocked";
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, phone?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateSession: (data: Partial<AppUser>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function loadProfile(supabaseUser: SupabaseUser): Promise<AppUser | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", supabaseUser.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", supabaseUser.id),
  ]);
  if (!profile) return null;
  // Priority: admin > dentist > assistant > receptionist > patient
  const order: UserRole[] = ["admin", "dentist", "assistant", "receptionist", "patient"];
  const userRoles = (roles ?? []).map(r => r.role as UserRole);
  const role = order.find(r => userRoles.includes(r)) ?? "patient";
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    role,
    status: profile.status as AppUser["status"],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadSeq = useRef(0);

  const applySession = useCallback(async (newSession: Session | null) => {
    const seq = ++loadSeq.current;
    setSession(newSession);
    setUser(null);

    if (!newSession?.user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const profile = await loadProfile(newSession.user);
      if (seq !== loadSeq.current) return;
      setUser(profile);
    } catch (e) {
      if (seq !== loadSeq.current) return;
      console.error("Erro ao carregar perfil do usuário", e);
      setUser(null);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void applySession(newSession);
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      void applySession(existing);
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
      if (profile && profile.status !== "active") {
        await supabase.auth.signOut();
        const reason = profile.status === "blocked" ? "Sua conta está bloqueada." : "Sua conta está inativa.";
        return { ok: false, error: `${reason} Entre em contato com o administrador.` };
      }
      await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", data.user.id);
      try {
        await supabase.from("audit_logs").insert({
          user_id: data.user.id, user_name: data.user.email,
          action: "login", entity: "auth", entity_id: data.user.id,
        });
      } catch { /* ignore */ }
    }
    return { ok: true };
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectUrl, data: { name, phone: phone ?? null } },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        await supabase.from("audit_logs").insert({
          user_id: auth.user.id, user_name: auth.user.email,
          action: "logout", entity: "auth", entity_id: auth.user.id,
        });
      }
    } catch { /* ignore */ }
    ++loadSeq.current;
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  }, []);

  const updateSession = useCallback((data: Partial<AppUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout, updateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
