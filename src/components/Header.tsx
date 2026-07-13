import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, LayoutDashboard, Settings, Sun, Moon, User, BarChart3, PieChart, Download, FileText, DollarSign, Target } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/contexts/RoleContext";
import { NotificationBell } from "./NotificationBell";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import logoWhite from "@/assets/logo-white.png";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { role } = useUserRole();
  const { canInstall, install } = usePwaInstall();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const allNavItems = [
    { path: "/", label: "Kanban", icon: LayoutDashboard },
    { path: "/vendas", label: "Vendas", icon: DollarSign },
    { path: "/relatorios", label: "Relatórios", icon: FileText },
    { path: "/results", label: "Resultados", icon: BarChart3 },
    { path: "/crm-config", label: "Configurações", icon: Settings, adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || role === "admin");

  return (
    <>
      <header className="glass-strong sticky top-0 z-40 flex items-center justify-between px-4 py-2 md:grid md:grid-cols-3 md:px-8 md:py-4">
        <div className="flex items-center">
          <img
            src={theme === "dark" ? logoWhite : logo}
            alt="Elisa Portas de Enrolar"
            className="h-8 md:h-11 object-contain drop-shadow-md"
          />
        </div>

        {!isMobile && (
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
        )}

        <div className="flex items-center justify-end gap-2">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center rounded-full border border-border p-2 text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground">
                <User className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer gap-2">
                <User className="h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer gap-2">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
              </DropdownMenuItem>
              {canInstall && (
                <DropdownMenuItem onClick={install} className="cursor-pointer gap-2">
                  <Download className="h-4 w-4" />
                  Baixar App
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {isMobile && (
        <nav className="glass-strong fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border px-2 py-2">
          {navItems.map(({ path, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`
                  flex items-center justify-center rounded-full p-3 transition-all duration-200
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}
