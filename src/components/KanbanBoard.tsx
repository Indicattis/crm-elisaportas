import { useState, useEffect, useCallback, useRef } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent, DragOverEvent } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { KanbanColumn } from "./KanbanColumn";
import { DealDialog } from "./DealDialog";
import { DealDetailDialog } from "./DealDetailDialog";
import { DealCard } from "./DealCard";
import { DealsListView } from "./DealsListView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { createDealTasksForColumn, deletePendingDealTasks } from "@/lib/deal-tasks";
import { createNotification } from "@/lib/notifications";
import { LayoutGrid, List } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

...

export function KanbanBoard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewingDeal, setViewingDeal] = useState<Deal | null>(null);
  const [viewingColumnColor, setViewingColumnColor] = useState<string>("");
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStatus, setDefaultStatus] = useState("");
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [activeOverStatus, setActiveOverStatus] = useState<string | null>(null);
  const [dealTagsMap, setDealTagsMap] = useState<Record<string, DealTag[]>>({});
  const [allTags, setAllTags] = useState<DealTag[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string | null; avatar_url: string | null }>>({});
  const [overdueDeals, setOverdueDeals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const { toast } = useToast();

...

  useEffect(() => { fetchOverdueTasks(); }, [fetchOverdueTasks]);

  const resolveStatusFromTargetId = useCallback((targetId?: string | null) => {
    if (!targetId) return null;

    const column = columns.find((item) => item.name === targetId);
    if (column) return column.name;

    const targetDeal = deals.find((item) => item.id === targetId);
    return targetDeal?.status ?? null;
  }, [columns, deals]);

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal || null);
    setActiveOverStatus(deal?.status ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setActiveOverStatus(resolveStatusFromTargetId(event.over?.id as string | undefined));
  };

  const handleDragCancel = () => {
    setActiveDeal(null);
    setActiveOverStatus(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const newStatus = resolveStatusFromTargetId(over?.id as string | undefined);

    setActiveDeal(null);
    setActiveOverStatus(null);

    if (!newStatus) return;

    const dealId = active.id as string;
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

...

      ) : (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={scrollContainerRef}
          className={`flex gap-4 overflow-x-auto p-6 pb-8 h-[calc(100vh-120px)] ${isGrabbing ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          onMouseDown={handleGrabMouseDown}
          onMouseMove={handleGrabMouseMove}
          onMouseUp={handleGrabMouseUp}
          onMouseLeave={handleGrabMouseLeave}
        >
          {columns.map((col) => {
            const isDraggingAcrossColumns = Boolean(activeDeal && activeOverStatus && activeOverStatus !== activeDeal.status);
            const columnDeals = deals.filter((d) => d.status === col.name).filter((d) => !isDraggingAcrossColumns || d.id !== activeDeal?.id);

            return (
              <KanbanColumn
                key={col.id}
                status={col.name}
                color={col.color}
                deals={columnDeals}
                dealTagsMap={dealTagsMap}
                allTags={allTags}
                profilesMap={profilesMap}
                overdueDeals={overdueDeals}
                showDropSpacer={Boolean(activeDeal && activeOverStatus === col.name && activeDeal.status !== col.name)}
                onTagsChanged={handleTagToggle}
                onCapture={handleCapture}
                onAddDeal={handleAddDeal}
                onEditDeal={handleViewDeal}
              />
            );
          })}
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
