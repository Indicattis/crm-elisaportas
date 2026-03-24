import { useState, useEffect, useCallback } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { KanbanColumn } from "./KanbanColumn";
import { DealDialog } from "./DealDialog";
import { DealCard } from "./DealCard";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const STATUSES = [
  "Lead", "Fazer orçamento", "Orçamento enviado", "Propenso a fechar",
  "Aguardando obra", "Sem interesse", "Excluído (Perda de tempo)",
  "Visitas", "Pedidos a lançar", "Cliente fechado",
];

type DealWithClient = Tables<"deals"> & { clients?: Tables<"clients"> | null };

export function KanbanBoard() {
  const [deals, setDeals] = useState<DealWithClient[]>([]);
  const [clients, setClients] = useState<Tables<"clients">[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithClient | null>(null);
  const [defaultStatus, setDefaultStatus] = useState("Lead");
  const [activeDeal, setActiveDeal] = useState<DealWithClient | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchDeals = useCallback(async () => {
    const { data, error } = await supabase
      .from("deals")
      .select("*, clients(*)")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar negociações", description: error.message, variant: "destructive" });
    } else {
      setDeals(data || []);
    }
  }, [toast]);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    setClients(data || []);
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchClients();
  }, [fetchDeals, fetchClients]);

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const newStatus = over.id as string;

    if (!STATUSES.includes(newStatus)) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.status === newStatus) return;

    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d)));

    const { error } = await supabase.from("deals").update({ status: newStatus }).eq("id", dealId);
    if (error) {
      toast({ title: "Erro ao mover", description: error.message, variant: "destructive" });
      fetchDeals();
    }
  };

  const handleAddDeal = (status: string) => {
    setEditingDeal(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  };

  const handleEditDeal = (deal: DealWithClient) => {
    setEditingDeal(deal);
    setDialogOpen(true);
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto p-6 pb-8">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              deals={deals.filter((d) => d.status === status)}
              onAddDeal={handleAddDeal}
              onEditDeal={handleEditDeal}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} onClick={() => {}} />}
        </DragOverlay>
      </DndContext>

      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deal={editingDeal}
        defaultStatus={defaultStatus}
        clients={clients}
        onSaved={() => { fetchDeals(); fetchClients(); }}
      />
    </>
  );
}
