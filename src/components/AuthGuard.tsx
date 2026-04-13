import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

interface AuthGuardProps {
  children: React.ReactNode;
}

function AuthGuardInner({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setMustChangePassword((data as any)?.must_change_password === true);
      });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <RoleProvider>
      {mustChangePassword && (
        <ChangePasswordModal
          userId={user.id}
          onChanged={() => setMustChangePassword(false)}
        />
      )}
      {children}
    </RoleProvider>
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  return (
    <AuthProvider>
      <AuthGuardInner>{children}</AuthGuardInner>
    </AuthProvider>
  );
}
