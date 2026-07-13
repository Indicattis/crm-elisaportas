import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PlanningColumn } from "@/components/planning/PlanningColumn";

export type Temperature = "hot" | "warm";

export interface PlanningClient {
  id: string;
  seller_id: string;
  name: string;
  value: number;
  temperature: Temperature;
  created_at: string;
}

interface Seller {
  id: string;
  name: string;
}

export default function SalesPlanning() {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [clients, setClients] = useState<PlanningClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "vendedor");
    const ids = (roles || []).map((r) => r.user_id);
    let list: Seller[] = [];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids)
        .order("full_name");
      list = (profs || []).map((p) => ({ id: p.id, name: p.full_name || "Sem nome" }));
    }
    setSellers(list);

    const { data: cData } = await supabase
      .from("sales_planning_clients")
      .select("id, seller_id, name, value, temperature, created_at");
    setClients((cData as PlanningClient[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAdd = async (
    sellerId: string,
    payload: { name: string; value: number; temperature: Temperature },
  ) => {
    const { data, error } = await supabase
      .from("sales_planning_clients")
      .insert({
        seller_id: sellerId,
        name: payload.name,
        value: payload.value,
        temperature: payload.temperature,
        created_by: user?.id,
      })
      .select("id, seller_id, name, value, temperature, created_at")
      .single();

    if (error || !data) {
      toast.error("Erro ao adicionar", { description: error?.message });
      return;
    }
    setClients((prev) => [...prev, data as PlanningClient]);
    toast.success("Cliente adicionado");
  };

  const handleComplete = async (id: string) => {
    // Optimistic remove
    const prev = clients;
    setClients((cs) => cs.filter((c) => c.id !== id));
    const { error } = await supabase.from("sales_planning_clients").delete().eq("id", id);
    if (error) {
      setClients(prev);
      toast.error("Erro ao concluir", { description: error.message });
      return;
    }
    toast.success("Cliente concluído");
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="glass rounded-xl p-3">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Planejamento de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Prospecção ativa organizada por vendedor
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-[300px] shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : sellers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          Nenhum vendedor cadastrado.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {sellers.map((s) => (
            <PlanningColumn
              key={s.id}
              seller={s}
              clients={clients.filter((c) => c.seller_id === s.id)}
              onAdd={(payload) => handleAdd(s.id, payload)}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
