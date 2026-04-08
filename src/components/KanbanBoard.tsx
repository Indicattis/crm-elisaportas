import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { KanbanColumn } from "./KanbanColumn";
import { DealDialog } from "./DealDialog";
import { DealDetailDialog } from "./DealDetailDialog";
import { DealCard } from "./DealCard";
import { DealsListView } from "./DealsListView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { createDealTasksForColumn, deletePendingDealTasks } from "@/lib/deal-tasks";
import { createNotification } from "@/lib/notifications";
import { LayoutGrid, List, Search, User } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [funnelMembers, setFunnelMembers] = useState<{ id: string; full_name: string | null }[]>([]);
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
  const [nextTaskMap, setNextTaskMap] = useState<Record<string, string>>({});
  const [dailyColorsMap, setDailyColorsMap] = useState<Record<string, string>>({});
  const [channelIconMap, setChannelIconMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const { toast } = useToast();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const grabStartX = useRef(0);
  const grabScrollLeft = useRef(0);

  const handleGrabMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-deal-card]")) return;
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

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
      .eq("archived", false)
      .neq("status", "Perdida")
      .neq("status", "Vendido")
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

  const fetchAllTags = useCallback(async () => {
    const { data } = await supabase.from("tags").select("id, name, color").order("name");
    setAllTags(data || []);
  }, []);

  const fetchFunnelMembers = useCallback(async () => {
    if (!selectedFunnelId) return;
    const { data } = await supabase
      .from("funnel_members")
      .select("user_id")
      .eq("funnel_id", selectedFunnelId);

    if (data && data.length > 0) {
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      setFunnelMembers(
        (profiles || []).map((p: any) => ({ id: p.id, full_name: p.full_name }))
          .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""))
      );
    } else {
      setFunnelMembers([]);
    }
  }, [selectedFunnelId]);

  // Sync viewingDeal when deals array is refreshed
  useEffect(() => {
    if (viewingDeal && detailOpen) {
      const updated = deals.find((d) => d.id === viewingDeal.id);
      if (updated && updated.updated_at !== viewingDeal.updated_at) {
        setViewingDeal(updated);
      }
    }
  }, [deals, viewingDeal, detailOpen]);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  const fetchDailyColors = useCallback(async () => {
    if (!selectedFunnelId || deals.length === 0) return;
    const dealIds = deals.map((d) => d.id);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("deal_daily_color")
      .select("deal_id, color")
      .in("deal_id", dealIds)
      .eq("date", today);
    const map: Record<string, string> = {};
    (data || []).forEach((row: any) => { map[row.deal_id] = row.color; });
    setDailyColorsMap(map);
  }, [deals, selectedFunnelId]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchColumns(), fetchDeals(), fetchDealTags()]);
      setLoading(false);
    };

    loadAll();
  }, [fetchColumns, fetchDeals, fetchDealTags]);

  useEffect(() => {
    fetchFunnelMembers();
  }, [fetchFunnelMembers]);

  const fetchProfiles = useCallback(async () => {
    const assignedIds = [
      ...new Set(deals.filter((d) => d.assigned_to).map((d) => d.assigned_to as string)),
    ];

    if (assignedIds.length === 0) {
      setProfilesMap({});
      return;
    }

    const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", assignedIds);
    const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    (data || []).forEach((profile: any) => {
      map[profile.id] = { full_name: profile.full_name, avatar_url: profile.avatar_url };
    });
    setProfilesMap(map);
  }, [deals]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    fetchAllTags();
  }, [fetchAllTags]);

  const fetchOverdueTasks = useCallback(async () => {
    if (deals.length === 0) {
      setOverdueDeals(new Set());
      setNextTaskMap({});
      return;
    }

    const dealIds = deals.map((deal) => deal.id);
    const { data } = await supabase
      .from("deal_tasks")
      .select("deal_id, deadline_at")
      .in("deal_id", dealIds)
      .eq("completed", false)
      .order("deadline_at", { ascending: true });

    const overdue = new Set<string>();
    const nextMap: Record<string, string> = {};
    const now = new Date().toISOString();

    (data || []).forEach((task: any) => {
      if (task.deadline_at < now) overdue.add(task.deal_id);
      if (!nextMap[task.deal_id]) nextMap[task.deal_id] = task.deadline_at;
    });

    setOverdueDeals(overdue);
    setNextTaskMap(nextMap);
  }, [deals]);

  useEffect(() => {
    fetchOverdueTasks();
  }, [fetchOverdueTasks]);

  useEffect(() => {
    fetchDailyColors();
  }, [fetchDailyColors]);

  useEffect(() => {
    supabase.from("acquisition_channels").select("name, icon").then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((ch: any) => { map[ch.name] = ch.icon; });
      setChannelIconMap(map);
    });
  }, []);

  const handleColorChange = async (dealId: string, newColor: string) => {
    setDailyColorsMap((prev) => ({ ...prev, [dealId]: newColor }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("deal_daily_color")
      .select("id")
      .eq("deal_id", dealId)
      .eq("date", today)
      .maybeSingle();
    if (existing) {
      await supabase.from("deal_daily_color").update({ color: newColor, updated_by: user.id } as any).eq("id", existing.id);
    } else {
      await supabase.from("deal_daily_color").insert({ deal_id: dealId, color: newColor, date: today, updated_by: user.id } as any);
    }
  };

  const resolveStatusFromTargetId = useCallback(
    (targetId?: string | null) => {
      if (!targetId) return null;

      const column = columns.find((item) => item.name === targetId);
      if (column) return column.name;

      const targetDeal = deals.find((item) => item.id === targetId);
      return targetDeal?.status ?? null;
    },
    [columns, deals]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((item) => item.id === event.active.id);
    setActiveDeal(deal || null);
    setActiveOverStatus(deal?.status ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setActiveOverStatus(resolveStatusFromTargetId(event.over?.id ? String(event.over.id) : null));
  };

  const handleDragCancel = () => {
    setActiveDeal(null);
    setActiveOverStatus(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const newStatus = resolveStatusFromTargetId(over?.id ? String(over.id) : null);

    setActiveDeal(null);
    setActiveOverStatus(null);

    if (!newStatus) return;

    const dealId = active.id as string;
    const validStatuses = columns.map((column) => column.name);
    if (!validStatuses.includes(newStatus)) return;

    const deal = deals.find((item) => item.id === dealId);
    if (!deal || deal.status === newStatus) return;

    setDeals((prev) => prev.map((item) => (item.id === dealId ? { ...item, status: newStatus } : item)));

    const oldStatus = deal.status;
    const { error } = await supabase.from("deals").update({ status: newStatus }).eq("id", dealId);

    if (error) {
      toast({ title: "Erro ao mover", description: error.message, variant: "destructive" });
      fetchDeals();
      return;
    }

    await deletePendingDealTasks(dealId);
    await createDealTasksForColumn(dealId, newStatus, selectedFunnelId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("deal_history").insert({
        deal_id: dealId,
        user_id: user.id,
        event_type: "column_change",
        description: `Moveu de "${oldStatus}" para "${newStatus}"`,
        metadata: { from: oldStatus, to: newStatus },
      } as any);

      if (deal.assigned_to) {
        await createNotification({
          userId: deal.assigned_to,
          dealId,
          type: "column_change",
          title: "Negociação movida",
          message: `"${deal.title}" foi movida de "${oldStatus}" para "${newStatus}".`,
        });
      }
    }
  };

  const handleAddDeal = (status: string) => {
    setEditingDeal(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  };

  const handleViewDeal = (deal: Deal) => {
    const column = columns.find((item) => item.name === deal.status);
    setViewingColumnColor(column?.color || "");
    setViewingDeal(deal);
    setDetailOpen(true);
  };

  const handleCapture = async (dealId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("deals").update({ assigned_to: user.id } as any).eq("id", dealId);

    if (error) {
      toast({ title: "Erro ao capturar", description: error.message, variant: "destructive" });
      return;
    }

    const deal = deals.find((item) => item.id === dealId);
    await createNotification({
      userId: user.id,
      dealId,
      type: "deal_assigned",
      title: "Negociação atribuída",
      message: `A negociação "${deal?.title || ""}" foi atribuída a você.`,
    });
    toast({ title: "Negociação capturada!" });
    fetchDeals();
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

  const filterBySeller = useCallback((deal: Deal) => {
    if (selectedSellerId === "all") return true;
    if (selectedSellerId === "unassigned") return deal.assigned_to === null;
    return deal.assigned_to === selectedSellerId;
  }, [selectedSellerId]);

  return (
    <>
      <div className="px-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {funnels.length === 0 && loading ? (
            <Skeleton className="h-10 w-56" />
          ) : funnels.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum funil disponível</p>
          ) : (
            <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecionar funil" />
              </SelectTrigger>
              <SelectContent>
                {funnels.map((funnel) => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, nº ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
            <SelectTrigger className="w-48">
              <User className="h-4 w-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              <SelectItem value="unassigned">Sem responsável</SelectItem>
              {funnelMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name || "Sem nome"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "kanban" | "list")}>
          <ToggleGroupItem value="kanban" aria-label="Kanban" size="sm">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Lista" size="sm">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto p-6 pb-8 h-[calc(100vh-120px)]">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex-shrink-0 w-72 space-y-3 h-full">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : funnels.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-120px)] text-muted-foreground">
          <p>Você não tem acesso a nenhum funil. Solicite acesso a um administrador.</p>
        </div>
      ) : viewMode === "list" ? (
        <DealsListView
          deals={deals.filter(filterBySeller).filter((d) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const qDigits = q.replace(/\D/g, "");
            return d.title.toLowerCase().includes(q) || (d.deal_number != null && String(d.deal_number).includes(q)) || (qDigits.length >= 4 && d.phone && d.phone.replace(/\D/g, "").includes(qDigits));
          })}
          columns={columns}
          dealTagsMap={dealTagsMap}
          profilesMap={profilesMap}
          onEditDeal={handleViewDeal}
          onCapture={handleCapture}
        />
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
            className={`flex gap-4 overflow-x-auto p-6 pb-8 h-[calc(100vh-120px)] ${isGrabbing ? "cursor-grabbing select-none" : "cursor-grab"}`}
            onMouseDown={handleGrabMouseDown}
            onMouseMove={handleGrabMouseMove}
            onMouseUp={handleGrabMouseUp}
            onMouseLeave={handleGrabMouseLeave}
          >
            {columns.map((column) => {
              const isDraggingAcrossColumns = Boolean(
                activeDeal && activeOverStatus && activeOverStatus !== activeDeal.status
              );
              const q = searchQuery.toLowerCase().trim();
              const columnDeals = deals
                .filter((deal) => deal.status === column.name)
                .filter(filterBySeller)
                .filter((deal) => !isDraggingAcrossColumns || deal.id !== activeDeal?.id)
                .filter((deal) => {
                  if (!q) return true;
                  const matchName = deal.title.toLowerCase().includes(q);
                  const matchNumber = deal.deal_number != null && String(deal.deal_number).includes(q);
                  const qDigits = q.replace(/\D/g, "");
                  const matchPhone = qDigits.length >= 4 && deal.phone && deal.phone.replace(/\D/g, "").includes(qDigits);
                  return matchName || matchNumber || matchPhone;
                });

              return (
                <KanbanColumn
                  key={column.id}
                  status={column.name}
                  color={column.color}
                  deals={columnDeals}
                  dealTagsMap={dealTagsMap}
                  allTags={allTags}
                  profilesMap={profilesMap}
                  overdueDeals={overdueDeals}
                  dailyColorsMap={dailyColorsMap}
                  nextTaskMap={nextTaskMap}
                  channelIconMap={channelIconMap}
                  showDropSpacer={Boolean(
                    activeDeal && activeOverStatus === column.name && activeDeal.status !== column.name
                  )}
                  onTagsChanged={handleTagToggle}
                  onCapture={handleCapture}
                  onColorChange={handleColorChange}
                  onAddDeal={handleAddDeal}
                  onEditDeal={handleViewDeal}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeDeal ? <DealCard deal={activeDeal} tags={dealTagsMap[activeDeal.id]} onClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <DealDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        deal={viewingDeal}
        statuses={columns.map((column) => column.name)}
        columnColor={viewingColumnColor}
        onUpdated={() => {
          fetchDeals();
          fetchDealTags();
        }}
      />

      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deal={editingDeal}
        defaultStatus={defaultStatus}
        statuses={columns.map((column) => column.name)}
        funnelId={selectedFunnelId}
        onSaved={() => {
          fetchDeals();
        }}
      />
    </>
  );
}
