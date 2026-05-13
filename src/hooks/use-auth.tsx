import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "doctor" | "secretary" | null;
type Status = "pending" | "approved" | "rejected" | null;

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  clinic_name: string | null;
  status: Status;
  doctor_id: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: Role;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    const [{ data: roleRow }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    setRole((roleRow?.role as Role) ?? null);
    setProfile((prof as Profile) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        setRole(null);
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) loadUserData(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Realtime: react to own profile status changes (approval/rejection) instantly
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          setProfile((prev) => ({ ...(prev as Profile), ...(payload.new as Profile) }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const refresh = async () => {
    if (session?.user) await loadUserData(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, role, profile, loading, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
