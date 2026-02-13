import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type UserRole = Tables<"user_roles">;
type EntityStatus = "draft" | "pending" | "active" | "blocked";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRoles: UserRole[];
  clinicId: string | null;
  clinicStatus: EntityStatus | null;
  profileComplete: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicStatus, setClinicStatus] = useState<EntityStatus | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRolesAndProfile = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId);
    const roles = data ?? [];
    setUserRoles(roles);
    const cId = roles.length > 0 ? roles[0].clinic_id : null;
    setClinicId(cId);

    if (cId) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("profile_complete, status")
        .eq("id", cId)
        .single();
      setProfileComplete(!!(clinic as any)?.profile_complete);
      setClinicStatus((clinic as any)?.status as EntityStatus ?? null);
    } else {
      setProfileComplete(false);
      setClinicStatus(null);
    }
  };

  const refreshProfile = async () => {
    if (clinicId) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("profile_complete, status")
        .eq("id", clinicId)
        .single();
      setProfileComplete(!!(clinic as any)?.profile_complete);
      setClinicStatus((clinic as any)?.status as EntityStatus ?? null);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      await fetchRolesAndProfile(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchRolesAndProfile(session.user.id), 0);
        } else {
          setUserRoles([]);
          setClinicId(null);
          setClinicStatus(null);
          setProfileComplete(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user, userRoles, clinicId, clinicStatus, profileComplete, loading, refreshProfile, refreshRoles, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
