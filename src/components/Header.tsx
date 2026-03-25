import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { LogOut, Users, LayoutDashboard, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import logo from "@/assets/logo.png";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItems = [
    { path: "/", label: "Kanban", icon: LayoutDashboard },
    { path: "/clients", label: "Clientes", icon: Users },
    { path: "/crm-config", label: "Configurações", icon: Settings },
  ];

  return (
    <header className="glass-strong sticky top-0 z-40 grid grid-cols-3 items-center px-8 py-4">
      {/* Left: Logo */}
      <div className="flex items-center">
        <img
          src={logo}
          alt="Elisa Portas de Enrolar"
          className="h-11 object-contain drop-shadow-md"
        />
      </div>

      {/* Center: Navigation */}
      <nav className="flex items-center justify-center gap-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`
                relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium
                transition-all duration-200 ease-in-out
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }
              `}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Logout */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
}
