import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/contexts/RoleContext";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { role, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && !allowedRoles.includes(role)) {
      navigate("/");
    }
  }, [role, loading, allowedRoles, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) return null;

  return <>{children}</>;
}
