import { useState, useEffect, useCallback } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { KanbanColumn } from "./KanbanColumn";
import { DealDialog } from "./DealDialog";
import { DealDetailDialog } from "./DealDetailDialog";
import { DealCard } from "./DealCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type DealWithClient = Tables<"deals"> & { clients?: Tables<"clients"> | null };

interface FunnelColumn {
  id: string;
  funnel_id: string;
  name: string;
  color: string;
  position: number;
}

export function KanbanBoard() {
  const [deals, setDeals] = useState<DealWithClient[]>([]);
  const [clients, setClients] = useState<Tables<"clients">[]>([]);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithClient | null>(null);
  const [defaultStatus, setDefaultStatus] = useState("");
  const [activeDeal, setActiveDeal] = useState<DealWithClient | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 5 } }));

  const fetchFunnels = useCallback(async () => {
    const { data } = await supabase.from("funnels").select("id, name").order("position");
    if (data && data.length > 0) {
      setFunnels(data);
      if (!selectedFunnelId) setSelectedFunnelId(data[0].id);
    } else {
      setFunnels([]);
    }
  }, [selectedFunnelId]);

  const fetchColumns = useCallback(async () => {
    if (!selectedFunnelId) return;
    const { data } = await supabase
      .from("funnel_columns")
      .select("*")
      .eq("funnel_id", selectedFunnelId)
      .order("position");
    setColumns(data || []);
  }, [selectedFunnelId]);

  const fetchDeals = useCallback(async () => {
    if (!selectedFunnelId) return;
    const { data, error } = await supabase
      .from("deals")
      .select("*, clients(*)")
      .eq("funnel_id", selectedFunnelId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar negociações", description: error.message, variant: "destructive" });
    } else {
      setDeals(data || []);
    }
  }, [selectedFunnelId, toast]);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    setClients(data || []);
  }, []);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);
  useEffect(() => { fetchColumns(); fetchDeals(); }, [fetchColumns, fetchDeals]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

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

    const validStatuses = columns.map((c) => c.name);
    if (!validStatuses.includes(newStatus)) return;

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
      <div className="px-6 pt-4">
        <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Selecionar funil" />
          </SelectTrigger>
          <SelectContent>
            {funnels.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto p-6 pb-8">
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              status={col.name}
              color={col.color}
              deals={deals.filter((d) => d.status === col.name)}
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
        statuses={columns.map((c) => c.name)}
        funnelId={selectedFunnelId}
        onSaved={() => { fetchDeals(); fetchClients(); }}
      />
    </>
  );
}
