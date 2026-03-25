import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "vendedor" | null;

interface RoleContextType {
  role: AppRole;
  loading: boolean;
  refetchRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  loading: true,
  refetchRole: async () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    try {
      const { data, error } = await supabase.rpc("get_my_role");
      if (error) {
        console.error("Error fetching role:", error);
        setRole(null);
      } else {
        setRole(data as AppRole);
      }
    } catch {
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, []);

  return (
    <RoleContext.Provider value={{ role, loading, refetchRole: fetchRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useUserRole() {
  return useContext(RoleContext);
}
