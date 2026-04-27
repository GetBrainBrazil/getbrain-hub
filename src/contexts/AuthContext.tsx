import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function logLoginEvent(userId: string, email: string | undefined) {
  try {
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    await supabase.from("system_audit_logs" as any).insert({
      user_id: userId,
      user_nome: prof?.full_name ?? email ?? null,
      acao: "Login",
      modulo: "Auth",
      resumo: `Login de ${email ?? userId}`,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    await supabase.from("profiles").update({ ultimo_acesso: new Date().toISOString() }).eq("id", userId);
  } catch {
    /* noop */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (event === "SIGNED_IN" && session?.user) {
        // Defer to avoid deadlock with auth callback
        setTimeout(() => logLoginEvent(session.user.id, session.user.email), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Compute isAdmin
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setIsAdmin(false); return; }
    supabase.rpc("has_role", { _user_id: uid, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
