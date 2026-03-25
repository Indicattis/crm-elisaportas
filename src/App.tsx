import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/AuthGuard";
import { RoleGuard } from "@/components/RoleGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Clients from "./pages/Clients";
import CrmConfig from "./pages/CrmConfig";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
        <Route path="/clients" element={<AuthGuard><Clients /></AuthGuard>} />
        <Route path="/crm-config" element={<AuthGuard><RoleGuard allowedRoles={["admin"]}><CrmConfig /></RoleGuard></AuthGuard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
