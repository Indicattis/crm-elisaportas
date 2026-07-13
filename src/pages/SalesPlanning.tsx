import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Users, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PlanningColumn } from "@/components/planning/PlanningColumn";
import { PlanningFooter } from "@/components/planning/PlanningFooter";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

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
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);

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

  const visibleSellers = useMemo(
    () => (selectedSellers.length === 0 ? sellers : sellers.filter((s) => selectedSellers.includes(s.id))),
    [sellers, selectedSellers],
  );

  const visibleIds = useMemo(() => new Set(visibleSellers.map((s) => s.id)), [visibleSellers]);

  const { hotSum, warmSum } = useMemo(() => {
    let hot = 0;
    let warm = 0;
    for (const c of clients) {
      if (!visibleIds.has(c.seller_id)) continue;
      if (c.temperature === "hot") hot += Number(c.value) || 0;
      else warm += Number(c.value) || 0;
    }
    return { hotSum: hot, warmSum: warm };
  }, [clients, visibleIds]);

  const toggleSeller = (id: string) =>
    setSelectedSellers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6 pb-32">
      <div className="flex items-center justify-between gap-3 flex-wrap">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Vendedores
              {selectedSellers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{selectedSellers.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">Filtrar vendedores</span>
              {selectedSellers.length > 0 && (
                <button
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={() => setSelectedSellers([])}
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {sellers.map((s) => {
                const checked = selectedSellers.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSeller(s.id)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm text-left"
                  >
                    <span className="truncate">{s.name}</span>
                    {checked && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-[300px] shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : visibleSellers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          Nenhum vendedor {sellers.length === 0 ? "cadastrado" : "selecionado"}.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleSellers.map((s) => (
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

      <PlanningFooter hot={hotSum} warm={warmSum} />
    </div>
  );
}
