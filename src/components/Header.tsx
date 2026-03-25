import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Users, LayoutDashboard, Settings } from "lucide-react";
import logo from "@/assets/logo.png";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className="glass-strong sticky top-0 z-40 flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-4">
        <img src={logo} alt="Elisa Portas de Enrolar" className="h-10 object-contain" />
        <nav className="flex gap-1">
          <Button
            variant={location.pathname === "/" ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate("/")}
          >
            <LayoutDashboard className="h-4 w-4 mr-1" />
            Kanban
          </Button>
          <Button
            variant={location.pathname === "/clients" ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate("/clients")}
          >
            <Users className="h-4 w-4 mr-1" />
            Clientes
          </Button>
          <Button
            variant={location.pathname === "/crm-config" ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate("/crm-config")}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurações
          </Button>
        </nav>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-1" />
        Sair
      </Button>
    </header>
  );
}
