import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { ContactsColumn } from "./ContactsColumn";
import { DealDialog } from "./DealDialog";
import { EntryRequirementsModal } from "./EntryRequirementsModal";
import { DealCard } from "./DealCard";
import { DealsListView } from "./DealsListView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { createNotification } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutGrid, List, Search, User, Rows3 } from "lucide-react";
import { StateCitySelect } from "./StateCitySelect";
import { SharedNotesDialog } from "./SharedNotesDialog";
import { RecurringTasksDialog } from "./RecurringTasksDialog";
import { KanbanLoading } from "./KanbanLoading";
import { KanbanTracks, type FunnelTrack } from "./KanbanTracks";
import { SellDateDialog } from "./SellDateDialog";
import { useUserRole } from "@/contexts/RoleContext";
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
  sort_order?: string;
}

const SESSION_KEY = "kanban-filters";
const readSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

export function KanbanBoard() {
  const sessionFilters = (typeof window !== "undefined" ? readSession() : {}) as {
    selectedFunnelId?: string;
    searchQuery?: string;
    selectedSellerId?: string;
    viewMode?: "kanban" | "list" | "tabs";
    filterState?: string;
    filterCity?: string;
    selectedTab?: string;
  };

  const [deals, setDeals] = useState<Deal[]>([]);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(sessionFilters.selectedFunnelId || "");
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [searchQuery, setSearchQuery] = useState(sessionFilters.searchQuery || "");
  const [selectedSellerId, setSelectedSellerId] = useState<string>(sessionFilters.selectedSellerId || "unassigned");
  const [funnelMembers, setFunnelMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const [channelPositionMap, setChannelPositionMap] = useState<Record<string, number>>({});
  const [dealStageMap, setDealStageMap] = useState<Record<string, { name: string; color: string; isRecurring?: boolean }>>({});
  const [taskProgressMap, setTaskProgressMap] = useState<Record<string, { completed: number; total: number }>>({});
  const [startOfDayMap, setStartOfDayMap] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const [tracks, setTracks] = useState<FunnelTrack[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "tabs">(sessionFilters.viewMode || "kanban");
  const [selectedTab, setSelectedTab] = useState<string>(sessionFilters.selectedTab || "");
  const [entryRequirements, setEntryRequirements] = useState<Record<string, { field_name: string }[]>>({});
  const [pendingMove, setPendingMove] = useState<{ deal: Deal; targetStatus: string } | null>(null);
  const [pendingMoveReqs, setPendingMoveReqs] = useState<{ field_name: string }[]>([]);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("kanban-collapsed-columns");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [filterState, setFilterState] = useState(sessionFilters.filterState || "");
  const [filterCity, setFilterCity] = useState(sessionFilters.filterCity || "");
  const [userSortOverrides, setUserSortOverrides] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("kanban_sort_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const toggleSortOverride = useCallback((columnName: string) => {
    setUserSortOverrides((prev) => {
      const next = { ...prev, [columnName]: !prev[columnName] };
      localStorage.setItem("kanban_sort_overrides", JSON.stringify(next));
      return next;
    });
  }, []);
  const { toast } = useToast();

  // Persist filters to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        selectedFunnelId, searchQuery, selectedSellerId, viewMode, filterState, filterCity, selectedTab,
      }));
    } catch { /* ignore */ }
  }, [selectedFunnelId, searchQuery, selectedSellerId, viewMode, filterState, filterCity, selectedTab]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnsRowRef = useRef<HTMLDivElement>(null);
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
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

    // Fetch entry requirements for all columns
    if (data && data.length > 0) {
      const colIds = data.map((c: any) => c.id);
      const { data: reqs } = await supabase
        .from("column_entry_requirements")
        .select("column_id, field_name")
        .in("column_id", colIds);
      const map: Record<string, { field_name: string }[]> = {};
      (reqs || []).forEach((r: any) => {
        if (!map[r.column_id]) map[r.column_id] = [];
        map[r.column_id].push({ field_name: r.field_name });
      });
      setEntryRequirements(map);
    }
  }, [selectedFunnelId]);

  const fetchTracks = useCallback(async () => {
    if (!selectedFunnelId) return;
    const { data } = await supabase
      .from("funnel_tracks" as any)
      .select("*")
      .eq("funnel_id", selectedFunnelId)
      .order("row_index");
    setTracks((data as any) || []);
  }, [selectedFunnelId]);



  const fetchDeals = useCallback(async () => {
    if (!selectedFunnelId) return [];
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("funnel_id", selectedFunnelId)
      .eq("archived", false)
      .neq("status", "Perdida")
      .neq("status", "Vendido")
      .neq("status", "Desqualificada")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar negociações", description: error.message, variant: "destructive" });
      return [];
    }
    setDeals(data || []);
    return data || [];
  }, [selectedFunnelId, toast]);

  const fetchDealTags = useCallback(async (dealIds?: string[]) => {
    if (!selectedFunnelId) return;
    let query = supabase
      .from("deal_tags")
      .select("deal_id, tag_id, tags(id, name, color)");
    if (dealIds && dealIds.length > 0) {
      query = query.in("deal_id", dealIds);
    }
    const { data } = await query;

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
    const { data: sellerRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "vendedor");
    const sellerIds = (sellerRoles || []).map((r: any) => r.user_id);
    if (sellerIds.length === 0) {
      setFunnelMembers([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", sellerIds);
    setFunnelMembers(
      (profiles || []).map((p: any) => ({ id: p.id, full_name: p.full_name }))
        .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""))
    );
  }, []);


  const navigate = useNavigate();

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  // Ensure selectedTab is valid for current columns
  useEffect(() => {
    const valid = columns.filter((c) => {
      const t = (c as any).column_type || ((c as any).is_notice ? "notice" : "deals");
      return t === "deals";
    }).map((c) => c.name);
    if (valid.length === 0) return;
    if (!selectedTab || !valid.includes(selectedTab)) {
      setSelectedTab(valid[0]);
    }
  }, [columns, selectedTab]);

  const fetchChannels = useCallback(async () => {
    const { data } = await supabase.from("acquisition_channels").select("name, icon, position").order("position");
    const iconMap: Record<string, string> = {};
    const posMap: Record<string, number> = {};
    (data || []).forEach((ch: any) => { iconMap[ch.name] = ch.icon; posMap[ch.name] = ch.position; });
    setChannelIconMap(iconMap);
    setChannelPositionMap(posMap);
  }, []);

  const fetchProfiles = useCallback(async (currentDeals: Deal[]) => {
    const assignedIds = [
      ...new Set(currentDeals.filter((d) => d.assigned_to).map((d) => d.assigned_to as string)),
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
  }, []);

  const fetchTasksData = useCallback(async (currentDeals: Deal[]) => {
    if (currentDeals.length === 0) {
      setOverdueDeals(new Set());
      setNextTaskMap({});
      setDealStageMap({});
      setTaskProgressMap({});
      return;
    }

    const dealIds = currentDeals.map((d) => d.id);
    const PAGE_SIZE = 1000;
    const chunks = chunkArray(dealIds, 100);

    // Run all chunks in parallel; each chunk paginates internally
    const chunkResults = await Promise.all(
      chunks.map(async (chunk) => {
        const tasks: any[] = [];
        let from = 0;
        while (true) {
          const { data: page } = await supabase
            .from("deal_tasks")
            .select("deal_id, deadline_at, stage_id, completed, cycle")
            .in("deal_id", chunk)
            .order("deadline_at", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
          if (!page || page.length === 0) break;
          tasks.push(...page);
          if (page.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return tasks;
      })
    );
    const allTasks = chunkResults.flat();

    // Compute overdue + next task + stage buckets in a single pass
    const overdue = new Set<string>();
    const nextMap: Record<string, string> = {};
    const now = new Date().toISOString();
    const dealStageIds: Record<string, Set<string>> = {};
    const stageBuckets: Record<string, Record<string, { total: number; completed: number }>> = {};

    for (const task of allTasks) {
      const dealId = task.deal_id as string;
      if (!task.completed && task.deadline_at < now) overdue.add(dealId);
      if (!task.completed && task.deadline_at >= now && !nextMap[dealId]) {
        nextMap[dealId] = task.deadline_at;
      }
      if (task.stage_id) {
        if (!dealStageIds[dealId]) dealStageIds[dealId] = new Set();
        dealStageIds[dealId].add(task.stage_id);
      }
      const cycle = task.cycle ?? 1;
      const stageKey = `${task.stage_id ?? "unstaged"}::${cycle}`;
      if (!stageBuckets[dealId]) stageBuckets[dealId] = {};
      if (!stageBuckets[dealId][stageKey]) stageBuckets[dealId][stageKey] = { total: 0, completed: 0 };
      stageBuckets[dealId][stageKey].total++;
      if (task.completed) stageBuckets[dealId][stageKey].completed++;
    }

    setOverdueDeals(overdue);
    setNextTaskMap(nextMap);

    const progress: Record<string, { completed: number; total: number }> = {};
    for (const [dealId, buckets] of Object.entries(stageBuckets)) {
      const stages = Object.values(buckets);
      const total = stages.length;
      const completed = stages.filter((s) => s.total > 0 && s.completed === s.total).length;
      progress[dealId] = { completed, total };
    }
    setTaskProgressMap(progress);

    const allStageIds = [...new Set(Object.values(dealStageIds).flatMap((s) => [...s]))];
    if (allStageIds.length > 0) {
      const { data: stages } = await supabase
        .from("task_group_stages")
        .select("id, name, color, position, group_id")
        .in("id", allStageIds);

      const groupIds = [...new Set((stages ?? []).map((s: any) => s.group_id).filter(Boolean))];
      const groupModeMap = new Map<string, string>();
      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from("task_groups")
          .select("id, schedule_mode")
          .in("id", groupIds as string[]);
        for (const g of groups ?? []) groupModeMap.set((g as any).id, (g as any).schedule_mode);
      }

      if (stages) {
        const stageById = new Map(stages.map((s: any) => [s.id, s]));
        const stageMap: Record<string, { name: string; color: string; isRecurring?: boolean }> = {};
        for (const [dealId, stageIdSet] of Object.entries(dealStageIds)) {
          let best: any = null;
          for (const sid of stageIdSet) {
            const s = stageById.get(sid);
            if (s && (!best || s.position < best.position)) best = s;
          }
          if (best) {
            stageMap[dealId] = {
              name: best.name,
              color: best.color,
              isRecurring: groupModeMap.get(best.group_id) === "recurring_days",
            };
          }
        }
        setDealStageMap(stageMap);
      }
    } else {
      setDealStageMap({});
    }
  }, []);



  const fetchDailyColors = useCallback(async (currentDeals: Deal[]) => {
    if (currentDeals.length === 0) return;
    const dealIdSet = new Set(currentDeals.map((d) => d.id));
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("deal_daily_color")
      .select("deal_id, color")
      .eq("date", today);
    const map: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      if (dealIdSet.has(row.deal_id)) map[row.deal_id] = row.color;
    });
    setDailyColorsMap(map);
  }, []);

  const captureAndFetchDailySnapshots = useCallback(async (funnelId: string, currentDeals: Deal[]) => {
    const today = new Date().toISOString().slice(0, 10);
    // Group current deals by (column, seller)
    const groups = new Map<string, { column_name: string; seller_id: string | null; count: number }>();
    for (const d of currentDeals) {
      const key = `${d.status}::${d.assigned_to ?? "null"}`;
      const g = groups.get(key) || { column_name: d.status, seller_id: (d.assigned_to as string | null) ?? null, count: 0 };
      g.count++;
      groups.set(key, g);
    }

    // Existing snapshots for today
    const { data: existing } = await supabase
      .from("column_daily_snapshots" as any)
      .select("column_name, seller_id, count")
      .eq("funnel_id", funnelId)
      .eq("date", today);

    const existingSet = new Set(
      (existing || []).map((r: any) => `${r.column_name}::${r.seller_id ?? "null"}`)
    );

    const toInsert = [...groups.values()]
      .filter((g) => !existingSet.has(`${g.column_name}::${g.seller_id ?? "null"}`))
      .map((g) => ({
        funnel_id: funnelId,
        column_name: g.column_name,
        seller_id: g.seller_id,
        count: g.count,
        date: today,
      }));

    if (toInsert.length > 0) {
      await supabase.from("column_daily_snapshots" as any).insert(toInsert);
    }

    const { data: allRows } = await supabase
      .from("column_daily_snapshots" as any)
      .select("column_name, seller_id, count")
      .eq("funnel_id", funnelId)
      .eq("date", today);

    const map: Record<string, Record<string, number>> = {};
    (allRows || []).forEach((r: any) => {
      const s = r.seller_id ?? "unassigned";
      if (!map[r.column_name]) map[r.column_name] = {};
      map[r.column_name][s] = r.count;
    });
    setStartOfDayMap(map);
  }, []);


  // BLOCK 1: Load core data, then unblock UI; tasks/colors load in background
  useEffect(() => {
    if (!selectedFunnelId) {
      // No funnel yet: don't keep the user stuck on the loading screen.
      // If funnels were already fetched (and there were none), release the spinner.
      if (funnels.length === 0) setLoading(false);
      return;
    }
    const loadAll = async () => {
      setLoading(true);
      try {
        const [, fetchedDeals] = await Promise.all([
          fetchColumns(),
          fetchDeals(),
          fetchFunnelMembers(),
          fetchAllTags(),
          fetchChannels(),
          fetchTracks(),
        ]);

        if (!fetchedDeals || fetchedDeals.length === 0) {
          setProfilesMap({});
          setOverdueDeals(new Set());
          setNextTaskMap({});
          setDealStageMap({});
          setDailyColorsMap({});
          setDealTagsMap({});
          setTaskProgressMap({});
          return;
        }

        const dealIds = fetchedDeals.map((d: Deal) => d.id);

        // Profiles & tags are needed for the card header — await them, then show board
        await Promise.all([
          fetchProfiles(fetchedDeals).catch((e) => console.error("fetchProfiles failed", e)),
          fetchDealTags(dealIds).catch((e) => console.error("fetchDealTags failed", e)),
        ]);

        // Heavy task/color data continues in background; badges fill in progressively
        Promise.all([
          fetchTasksData(fetchedDeals).catch((e) => console.error("fetchTasksData failed", e)),
          fetchDailyColors(fetchedDeals).catch((e) => console.error("fetchDailyColors failed", e)),
          captureAndFetchDailySnapshots(selectedFunnelId, fetchedDeals).catch((e) => console.error("dailySnapshots failed", e)),
        ]);
      } catch (e) {
        console.error("KanbanBoard initial load failed", e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [selectedFunnelId, funnels.length, fetchColumns, fetchDeals, fetchFunnelMembers, fetchAllTags, fetchChannels, fetchTracks, fetchProfiles, fetchTasksData, fetchDailyColors, fetchDealTags, captureAndFetchDailySnapshots]);

  // Helper to refresh deals + dependent data after mutations
  const refreshDeals = useCallback(async () => {
    const freshDeals = await fetchDeals();
    if (freshDeals.length > 0) {
      const dealIds = freshDeals.map((d: Deal) => d.id);
      await Promise.all([
        fetchProfiles(freshDeals),
        fetchTasksData(freshDeals),
        fetchDailyColors(freshDeals),
        fetchDealTags(dealIds),
      ]);
    }
  }, [fetchDeals, fetchProfiles, fetchTasksData, fetchDailyColors, fetchDealTags]);


  const handleColorChange = useCallback(async (dealId: string, newColor: string) => {
    setDailyColorsMap((prev) => ({ ...prev, [dealId]: newColor }));
    if (!authUser) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("deal_daily_color")
      .select("id")
      .eq("deal_id", dealId)
      .eq("date", today)
      .maybeSingle();
    if (existing) {
      await supabase.from("deal_daily_color").update({ color: newColor, updated_by: authUser.id } as any).eq("id", existing.id);
    } else {
      await supabase.from("deal_daily_color").insert({ deal_id: dealId, color: newColor, date: today, updated_by: authUser.id } as any);
    }
  }, [authUser]);

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

  const executeDealMove = async (deal: Deal, newStatus: string) => {
    const dealId = deal.id;
    const oldStatus = deal.status;

    setDeals((prev) => prev.map((item) => (item.id === dealId ? { ...item, status: newStatus } : item)));

    const { error } = await supabase.from("deals").update({ status: newStatus }).eq("id", dealId);

    if (error) {
      toast({ title: "Erro ao mover", description: error.message, variant: "destructive" });
      refreshDeals();
      return;
    }

    if (authUser) {
      await supabase.from("deal_history").insert({
        deal_id: dealId,
        user_id: authUser.id,
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
          currentUserId: authUser.id,
        });
      }
    }
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

    // Check entry requirements for target column (skip when moving backwards)
    const targetColumn = columns.find((c) => c.name === newStatus);
    const currentColumn = columns.find((c) => c.name === deal.status);
    const isBackwardMove =
      !!targetColumn && !!currentColumn && targetColumn.position <= currentColumn.position;
    if (targetColumn && !isBackwardMove) {
      const reqs = entryRequirements[targetColumn.id] || [];
      if (reqs.length > 0) {
        // Check which fields are missing
        const missing = reqs.filter((r) => {
          if (r.field_name === "task") return true; // always require task creation
          const val = deal[r.field_name as keyof Deal];
          return val === null || val === undefined || val === "" || val === 0;
        });

        if (missing.length > 0) {
          setPendingMove({ deal, targetStatus: newStatus });
          setPendingMoveReqs(missing);
          return;
        }
      }
    }

    await executeDealMove(deal, newStatus);
  };

  const handleAddDeal = useCallback((status: string) => {
    setEditingDeal(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  }, []);

  const handleViewDeal = useCallback((deal: Deal) => {
    navigate(`/deal/${deal.id}`);
  }, [navigate]);

  const toggleColumnCollapse = useCallback((columnName: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnName)) next.delete(columnName);
      else next.add(columnName);
      localStorage.setItem("kanban-collapsed-columns", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleCapture = useCallback(async (dealId: string) => {
    if (!authUser) return;

    const { error } = await supabase.from("deals").update({ assigned_to: authUser.id } as any).eq("id", dealId);

    if (error) {
      toast({ title: "Erro ao capturar", description: error.message, variant: "destructive" });
      return;
    }

    const deal = deals.find((item) => item.id === dealId);
    await createNotification({
      userId: authUser.id,
      dealId,
      type: "deal_assigned",
      title: "Negociação atribuída",
      message: `A negociação "${deal?.title || ""}" foi atribuída a você.`,
      currentUserId: authUser.id,
    });
    toast({ title: "Negociação capturada!" });
    refreshDeals();
  }, [authUser, deals, toast]);

  const handleQuickSell = useCallback(async (dealId: string) => {
    const statuses = columns.map((c) => c.name);
    if (statuses.length === 0) return;
    const lastStatus = statuses[statuses.length - 1];
    // Optimistic: remove from board immediately
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    const { error } = await supabase.from("deals").update({ status: lastStatus }).eq("id", dealId);
    if (error) {
      toast({ title: "Erro ao marcar como vendida", description: error.message, variant: "destructive" });
      refreshDeals();
      return;
    }
    toast({ title: "Negociação marcada como vendida!" });
  }, [columns, toast]);


  const handleTagToggle = useCallback(async (dealId: string, tagId: string, checked: boolean) => {
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

    refreshDeals();
  }, [toast]);

  const filterBySeller = useCallback((deal: Deal) => {
    if (selectedSellerId === "all") return true;
    if (selectedSellerId === "unassigned") return deal.assigned_to === null;
    return deal.assigned_to === selectedSellerId;
  }, [selectedSellerId]);

  const filterByLocation = useCallback((deal: Deal) => {
    if (filterState && deal.state !== filterState) return false;
    if (filterCity && deal.city !== filterCity) return false;
    return true;
  }, [filterState, filterCity]);

  return (
    <>
      <div className="px-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          <StateCitySelect
            state={filterState}
            city={filterCity}
            onStateChange={setFilterState}
            onCityChange={setFilterCity}
            compact
          />
          <SharedNotesDialog />
          <RecurringTasksDialog />
        </div>

        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "kanban" | "list" | "tabs")}>
          <ToggleGroupItem value="kanban" aria-label="Kanban" size="sm">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="tabs" aria-label="Abas" size="sm">
            <Rows3 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Lista" size="sm">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {loading ? (
        <KanbanLoading />
      ) : funnels.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-120px)] text-muted-foreground">
          <p>Você não tem acesso a nenhum funil. Solicite acesso a um administrador.</p>
        </div>
      ) : viewMode === "list" ? (
        <DealsListView
          deals={deals.filter(filterBySeller).filter(filterByLocation).filter((d) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const qDigits = q.replace(/\D/g, "");
            return d.title.toLowerCase().includes(q) || (d.deal_number != null && String(d.deal_number).includes(q)) || (qDigits.length >= 4 && d.phone && d.phone.replace(/\D/g, "").includes(qDigits));
          })}
          columns={columns}
          dealTagsMap={dealTagsMap}
          profilesMap={profilesMap}
          dealStageMap={dealStageMap}
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
          {viewMode === "tabs" && (
            <div className="px-6 pt-3 flex gap-2 overflow-x-auto">
              {columns.filter((c) => !(c as any).is_notice && ((c as any).column_type !== "contacts")).map((column) => {
                const count = deals.filter((d) => d.status === column.name).filter(filterBySeller).filter(filterByLocation).length;
                const active = selectedTab === column.name;
                return (
                  <button
                    key={column.id}
                    onClick={() => setSelectedTab(column.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${active ? "text-white shadow" : "text-foreground/70 hover:text-foreground bg-muted/40 border-transparent"}`}
                    style={active ? { backgroundColor: column.color, borderColor: column.color } : undefined}
                  >
                    {column.name}
                    <span className={`ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${active ? "bg-white/20" : "bg-foreground/10"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div
            ref={scrollContainerRef}
            className={`overflow-x-auto p-6 pb-8 ${viewMode === "tabs" ? "h-[calc(100vh-170px)]" : "h-[calc(100vh-120px)]"} ${isGrabbing ? "cursor-grabbing select-none" : "cursor-grab"}`}
            onMouseDown={handleGrabMouseDown}
            onMouseMove={handleGrabMouseMove}
            onMouseUp={handleGrabMouseUp}
            onMouseLeave={handleGrabMouseLeave}
          >
          <div className="flex flex-col gap-2 min-w-max">
          {viewMode !== "tabs" && (
            <KanbanTracks
              columns={columns.filter((c) => !(c as any).is_notice)}
              tracks={tracks}
              funnelId={selectedFunnelId}
              isAdmin={isAdmin}
              columnsRowRef={columnsRowRef}
              onChanged={fetchTracks}
            />
          )}
          <div ref={columnsRowRef} className="flex gap-4">
            {(viewMode === "tabs" ? columns.filter((c) => !(c as any).is_notice && ((c as any).column_type !== "contacts") && c.name === selectedTab) : columns).map((column) => {
              const colType: "deals" | "notice" | "contacts" =
                (column as any).column_type || ((column as any).is_notice ? "notice" : "deals");

              const wrap = (node: React.ReactNode) => (
                <div key={column.id} data-column-id={column.id} className="flex">{node}</div>
              );

              if (colType === "notice") {
                return wrap(

                  <KanbanColumn
                    status={column.name}

                    color={column.color}
                    deals={[]}
                    isNotice
                    noticeText={(column as any).notice_text || ""}
                    onAddDeal={() => {}}
                    onEditDeal={() => {}}
                  />
                );
              }

              if (colType === "contacts") {
                return wrap(
                  <ContactsColumn
                    status={column.name}
                    color={column.color}
                    columnId={column.id}
                    funnelId={selectedFunnelId}
                    hasDailyColor={(column as any).has_daily_color !== false}
                    allowedDailyColors={(column as any).daily_colors ?? ["red", "yellow", "green"]}
                    collapsed={collapsedColumns.has(column.name)}
                    onToggleCollapse={() => toggleColumnCollapse(column.name)}
                    onChanged={fetchDeals}
                  />
                );
              }




              const isDraggingAcrossColumns = Boolean(
                activeDeal && activeOverStatus && activeOverStatus !== activeDeal.status
              );
              const q = searchQuery.toLowerCase().trim();
              const columnDeals = deals
                .filter((deal) => deal.status === column.name)
                .filter(filterBySeller)
                .filter(filterByLocation)
                .filter((deal) => !isDraggingAcrossColumns || deal.id !== activeDeal?.id)
                .filter((deal) => {
                  if (!q) return true;
                  const matchName = deal.title.toLowerCase().includes(q);
                  const matchNumber = deal.deal_number != null && String(deal.deal_number).includes(q);
                  const qDigits = q.replace(/\D/g, "");
                  const matchPhone = qDigits.length >= 4 && deal.phone && deal.phone.replace(/\D/g, "").includes(qDigits);
                  return matchName || matchNumber || matchPhone;
                })
                .sort((a, b) => {
                  const isOverride = userSortOverrides[column.name];
                  const order = isOverride ? "created_at" : ((column as any).sort_order || "channel");
                  if (order === "alphabetical") return a.title.localeCompare(b.title);
                  if (order === "created_at") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                  if (order === "next_task") {
                    const rA = (a as any).return_date as string | null | undefined;
                    const rB = (b as any).return_date as string | null | undefined;
                    const tA = rA ? new Date(rA).getTime() : (nextTaskMap[a.id] ? new Date(nextTaskMap[a.id]).getTime() : Infinity);
                    const tB = rB ? new Date(rB).getTime() : (nextTaskMap[b.id] ? new Date(nextTaskMap[b.id]).getTime() : Infinity);
                    return tA - tB;
                  }
                  if (order === "return_date") {
                    const rA = (a as any).return_date as string | null | undefined;
                    const rB = (b as any).return_date as string | null | undefined;
                    const tA = rA ? new Date(rA).getTime() : Infinity;
                    const tB = rB ? new Date(rB).getTime() : Infinity;
                    return tA - tB;
                  }
                  if (order === "value_desc") return (b.value || 0) - (a.value || 0);
                  if (order === "value_asc") return (a.value || 0) - (b.value || 0);
                  // channel (default)
                  const pA = a.acquisition_channel ? (channelPositionMap[a.acquisition_channel] ?? 9999) : 9999;
                  const pB = b.acquisition_channel ? (channelPositionMap[b.acquisition_channel] ?? 9999) : 9999;
                  return pA - pB;
                });

              const snapshotForColumn = startOfDayMap[column.name] || {};
              let startOfDayCount = 0;
              if (selectedSellerId === "all") {
                startOfDayCount = Object.values(snapshotForColumn).reduce((a, b) => a + b, 0);
              } else if (selectedSellerId === "unassigned") {
                startOfDayCount = snapshotForColumn["unassigned"] || 0;
              } else {
                startOfDayCount = snapshotForColumn[selectedSellerId] || 0;
              }

              return wrap(
                <KanbanColumn
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
                  dealStageMap={dealStageMap}
                  taskProgressMap={taskProgressMap}
                  startOfDayCount={startOfDayCount}
                  hasDailyColor={(column as any).has_daily_color !== false}
                  allowedDailyColors={(column as any).daily_colors as string[] | undefined}
                  showSellButton={!!(column as any).show_sell_button}
                  onQuickSell={handleQuickSell}
                  showDropSpacer={Boolean(
                    activeDeal && activeOverStatus === column.name && activeDeal.status !== column.name
                  )}
                  collapsed={collapsedColumns.has(column.name)}
                  onToggleCollapse={() => toggleColumnCollapse(column.name)}
                  isCreatedAtSort={!!userSortOverrides[column.name]}
                  onToggleSort={() => toggleSortOverride(column.name)}
                  onTagsChanged={handleTagToggle}
                  onCapture={handleCapture}
                  onColorChange={handleColorChange}
                  onAddDeal={handleAddDeal}
                  onEditDeal={handleViewDeal}
                />
              );

            })}
          </div>
          </div>
          </div>

          <DragOverlay>
            {activeDeal ? <DealCard deal={activeDeal} tags={dealTagsMap[activeDeal.id]} onClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      )}


      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deal={editingDeal}
        defaultStatus={defaultStatus}
        statuses={columns.map((column) => column.name)}
        funnelId={selectedFunnelId}
        onSaved={() => { refreshDeals(); }}



      />

      {pendingMove && (
        <EntryRequirementsModal
          open={!!pendingMove}
          onOpenChange={(open) => { if (!open) { setPendingMove(null); setPendingMoveReqs([]); } }}
          deal={pendingMove.deal}
          requirements={pendingMoveReqs}
          targetStatus={pendingMove.targetStatus}
          funnelId={selectedFunnelId}
          onConfirm={async () => {
            const { deal, targetStatus } = pendingMove;
            setPendingMove(null);
            setPendingMoveReqs([]);
            // Re-fetch deal to get updated data
            const { data: freshDeal } = await supabase.from("deals").select("*").eq("id", deal.id).single();
            if (freshDeal) {
              await executeDealMove(freshDeal, targetStatus);
              refreshDeals();
            }
          }}
        />
      )}
    </>
  );
}
