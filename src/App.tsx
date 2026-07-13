import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/AuthGuard";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";

import CrmConfig from "./pages/CrmConfig";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import LeadForm from "./pages/LeadForm";
import Results from "./pages/Results";
import Sales from "./pages/Sales";
import SalesPlanning from "./pages/SalesPlanning";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import DealDetail from "./pages/DealDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/lead-form" element={<LeadForm />} />
        <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
          <Route path="/" element={<Index />} />
          <Route path="/results" element={<Results />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/vendas" element={<Sales />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/deal/:id" element={<DealDetail />} />
          <Route path="/crm-config" element={<RoleGuard allowedRoles={["admin"]}><CrmConfig /></RoleGuard>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
