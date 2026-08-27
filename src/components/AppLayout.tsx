import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { MonitoringBanner } from "@/components/MonitoringBanner";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MonitoringBanner />
      <Outlet />
    </div>
  );
}
