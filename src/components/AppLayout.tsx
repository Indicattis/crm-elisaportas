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
        <div className="flex w-full">
          <ClientsSidebar />
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
