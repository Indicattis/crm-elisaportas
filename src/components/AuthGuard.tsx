import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleProvider } from "@/contexts/RoleContext";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import type { Session } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/login");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setMustChangePassword((data as any)?.must_change_password === true);
      });
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <RoleProvider>
      {mustChangePassword && (
        <ChangePasswordModal
          userId={session.user.id}
          onChanged={() => setMustChangePassword(false)}
        />
      )}
      {children}
    </RoleProvider>
  );
}
