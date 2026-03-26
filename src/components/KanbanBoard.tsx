import { useState, useEffect, useCallback, useRef } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { KanbanColumn } from "./KanbanColumn";
import { DealDialog } from "./DealDialog";
import { DealDetailDialog } from "./DealDetailDialog";
import { DealCard } from "./DealCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { createDealTasksForColumn, deletePendingDealTasks } from "@/lib/deal-tasks";
import { createNotification } from "@/lib/notifications";
import type { Tables } from "@/integrations/supabase/types";

type DealWithClient = Tables<"deals"> & { clients?: Tables<"clients"> | null };

interface DealTag {
  id: string;
  name: string;
  color: string;
}

interface FunnelColumn {
  id: string;
  funnel_id: string;
  name: string;
  color: string;
  position: number;
}

export function KanbanBoard() {
  const [deals, setDeals] = useState<DealWithClient[]>([]);
  const [clients] = useState<Tables<"clients">[]>([]);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewingDeal, setViewingDeal] = useState<DealWithClient | null>(null);
  const [viewingColumnColor, setViewingColumnColor] = useState<string>("");
  const [editingDeal, setEditingDeal] = useState<DealWithClient | null>(null);
  const [defaultStatus, setDefaultStatus] = useState("");
  const [activeDeal, setActiveDeal] = useState<DealWithClient | null>(null);
  const [dealTagsMap, setDealTagsMap] = useState<Record<string, DealTag[]>>({});
  const [allTags, setAllTags] = useState<DealTag[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string | null; avatar_url: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Grab-to-scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const grabStartX = useRef(0);
  const grabScrollLeft = useRef(0);

  const handleGrabMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-deal-card]')) return;
    if (!scrollContainerRef.current) return;
    setIsGrabbing(true);
    grabStartX.current = e.pageX - scrollContainerRef.current.offsetLeft;
    grabScrollLeft.current = scrollContainerRef.current.scrollLeft;
  };

  const handleGrabMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGrabbing || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - grabStartX.current) * 1.5;
    scrollContainerRef.current.scrollLeft = grabScrollLeft.current - walk;
  };

  const handleGrabMouseUp = () => setIsGrabbing(false);
  const handleGrabMouseLeave = () => setIsGrabbing(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 100, tolerance: 5 } }));

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
      .select("*")
      .eq("funnel_id", selectedFunnelId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar negociações", description: error.message, variant: "destructive" });
    } else {
      setDeals(data || []);
    }
  }, [selectedFunnelId, toast]);

  const fetchDealTags = useCallback(async () => {
    if (!selectedFunnelId) return;
    const { data } = await supabase
      .from("deal_tags")
      .select("deal_id, tag_id, tags(id, name, color)");
    if (data) {
      const map: Record<string, DealTag[]> = {};
      data.forEach((dt: any) => {
        if (dt.tags) {
          if (!map[dt.deal_id]) map[dt.deal_id] = [];
          map[dt.deal_id].push(dt.tags);
        }
      });
      setDealTagsMap(map);
    }
  }, [selectedFunnelId]);

  const fetchClients = useCallback(async () => {
    // No longer needed - clients come from external database
  }, []);

  const fetchAllTags = useCallback(async () => {
    const { data } = await supabase.from("tags").select("id, name, color").order("name");
    setAllTags(data || []);
  }, []);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchColumns(), fetchDeals(), fetchDealTags()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchColumns, fetchDeals, fetchDealTags]);
  // Fetch profiles for assigned deals
  const fetchProfiles = useCallback(async () => {
    const assignedIds = [...new Set(deals.filter(d => (d as any).assigned_to).map(d => (d as any).assigned_to as string))];
    if (assignedIds.length === 0) { setProfilesMap({}); return; }
    const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", assignedIds);
    const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    (data || []).forEach((p: any) => { map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
    setProfilesMap(map);
  }, [deals]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);
  useEffect(() => { fetchClients(); fetchAllTags(); }, [fetchClients, fetchAllTags]);

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

    const oldStatus = deal.status;
    const { error } = await supabase.from("deals").update({ status: newStatus }).eq("id", dealId);
    if (error) {
      toast({ title: "Erro ao mover", description: error.message, variant: "destructive" });
      fetchDeals();
    } else {
      // Delete pending tasks from old column, create new ones for new column
      await deletePendingDealTasks(dealId);
      await createDealTasksForColumn(dealId, newStatus, selectedFunnelId);

      // Log history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("deal_history").insert({
          deal_id: dealId,
          user_id: user.id,
          event_type: "column_change",
          description: `Moveu de "${oldStatus}" para "${newStatus}"`,
          metadata: { from: oldStatus, to: newStatus },
        } as any);

        // Notify assigned user about column change
        const assignedTo = (deal as any).assigned_to;
        if (assignedTo) {
          await createNotification({
            userId: assignedTo,
            dealId,
            type: "column_change",
            title: "Negociação movida",
            message: `"${deal.title}" foi movida de "${oldStatus}" para "${newStatus}".`,
          });
        }
      }
    }
  };

  const handleAddDeal = (status: string) => {
    setEditingDeal(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  };

  const handleViewDeal = (deal: DealWithClient) => {
    const col = columns.find((c) => c.name === deal.status);
    setViewingColumnColor(col?.color || "");
    setViewingDeal(deal);
    setDetailOpen(true);
  };


  const handleCapture = async (dealId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("deals").update({ assigned_to: user.id } as any).eq("id", dealId);
    if (error) {
      toast({ title: "Erro ao capturar", description: error.message, variant: "destructive" });
    } else {
      const deal = deals.find(d => d.id === dealId);
      await createNotification({
        userId: user.id,
        dealId,
        type: "deal_assigned",
        title: "Negociação atribuída",
        message: `A negociação "${deal?.title || ""}" foi atribuída a você.`,
      });
      toast({ title: "Negociação capturada!" });
      fetchDeals();
    }
  };

  const handleTagToggle = async (dealId: string, tagId: string, checked: boolean) => {
    if (checked) {
      const { error } = await supabase.from("deal_tags").insert({ deal_id: dealId, tag_id: tagId });
      if (error) {
        toast({ title: "Erro ao adicionar tag", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase.from("deal_tags").delete().eq("deal_id", dealId).eq("tag_id", tagId);
      if (error) {
        toast({ title: "Erro ao remover tag", description: error.message, variant: "destructive" });
        return;
      }
    }
    fetchDealTags();
  };

  return (
    <>
      <div className="px-6 pt-4">
        {funnels.length === 0 && loading ? (
          <Skeleton className="h-10 w-56" />
        ) : (
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
        )}
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto p-6 pb-8 h-[calc(100vh-120px)]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-72 space-y-3 h-full">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          ref={scrollContainerRef}
          className={`flex gap-4 overflow-x-auto p-6 pb-8 h-[calc(100vh-120px)] ${isGrabbing ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          onMouseDown={handleGrabMouseDown}
          onMouseMove={handleGrabMouseMove}
          onMouseUp={handleGrabMouseUp}
          onMouseLeave={handleGrabMouseLeave}
        >
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              status={col.name}
              color={col.color}
              deals={deals.filter((d) => d.status === col.name)}
              dealTagsMap={dealTagsMap}
              allTags={allTags}
              profilesMap={profilesMap}
              onTagsChanged={handleTagToggle}
              onCapture={handleCapture}
              onAddDeal={handleAddDeal}
              onEditDeal={handleViewDeal}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} tags={dealTagsMap[activeDeal.id]} onClick={() => {}} />}
        </DragOverlay>
      </DndContext>
      )}

      <DealDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        deal={viewingDeal}
        statuses={columns.map((c) => c.name)}
        columnColor={viewingColumnColor}
        
        onUpdated={() => { fetchDeals(); fetchDealTags(); }}
      />

      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deal={editingDeal}
        defaultStatus={defaultStatus}
        statuses={columns.map((c) => c.name)}
        funnelId={selectedFunnelId}
        onSaved={() => { fetchDeals(); }}
      />
    </>
  );
}
