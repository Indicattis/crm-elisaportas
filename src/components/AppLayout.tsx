import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { MonitoringBanner } from "@/components/MonitoringBanner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ClientsSidebar } from "@/components/ClientsSidebar";

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={false} className="flex-col">
      <div className="min-h-screen w-full bg-background">
        <Header />
        <MonitoringBanner />
        <div className="h-0 w-0 overflow-visible">
          <ClientsSidebar />
        </div>
        <main className="w-full">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
