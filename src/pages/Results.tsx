import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, XCircle, Archive, History } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/contexts/RoleContext";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

interface StageEntry {
  count: number;
  totalValue: number;
  dealIds: Set<string>;
}

export default function Results() {
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [soldDeals, setSoldDeals] = useState<Deal[]>([]);
  const [lostDeals, setLostDeals] = useState<Deal[]>([]);
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Stage history state
  const [stageHistory, setStageHistory] = useState<{ date: string; stage: string; count: number; totalValue: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { role } = useUserRole();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const fetchFunnels = useCallback(async () => {
    const { data } = await supabase.from("funnels").select("id, name").order("position");
    setFunnels(data || []);
  }, []);

  const fetchDeals = useCallback(async () => {
    setLoading(true);

    // Sold
    let soldQuery = supabase.from("deals").select("*").eq("status", "Vendido").eq("archived", false);
    if (selectedFunnelId !== "all") soldQuery = soldQuery.eq("funnel_id", selectedFunnelId);
    const { data: sold } = await soldQuery.order("updated_at", { ascending: false });

    // Lost
    let lostQuery = supabase.from("deals").select("*").eq("status", "Perdida").eq("archived", false);
    if (selectedFunnelId !== "all") lostQuery = lostQuery.eq("funnel_id", selectedFunnelId);
    const { data: lost } = await lostQuery.order("updated_at", { ascending: false });

    // Archived
    let archivedQuery = supabase.from("deals").select("*").eq("archived", true);
    if (selectedFunnelId !== "all") archivedQuery = archivedQuery.eq("funnel_id", selectedFunnelId);
    const { data: archived } = await archivedQuery.order("updated_at", { ascending: false });

    setSoldDeals(sold || []);
    setLostDeals(lost || []);
    setArchivedDeals(archived || []);

    // Fetch profiles for assigned users
    const allDeals = [...(sold || []), ...(lost || []), ...(archived || [])];
    const assignedIds = [...new Set(allDeals.filter(d => d.assigned_to).map(d => d.assigned_to as string))];
    if (assignedIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", assignedIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach(p => { map[p.id] = p.full_name || "Sem nome"; });
      setProfilesMap(map);
    }

    setLoading(false);
  }, [selectedFunnelId]);

  const fetchStageHistory = useCallback(async () => {
    if (!currentUserId) return;
    setHistoryLoading(true);

    try {
      // Fetch column_change history
      const { data: historyData } = await supabase
        .from("deal_history")
        .select("deal_id, created_at, metadata")
        .eq("event_type", "column_change")
        .order("created_at", { ascending: false });

      if (!historyData || historyData.length === 0) {
        setStageHistory([]);
        setHistoryLoading(false);
        return;
      }

      // Get unique deal IDs
      const dealIds = [...new Set(historyData.map(h => h.deal_id))];

      // Fetch deals for values and assigned_to (in batches if needed)
      const batchSize = 50;
      const dealsMap: Record<string, { value: number | null; assigned_to: string | null; funnel_id: string | null }> = {};

      for (let i = 0; i < dealIds.length; i += batchSize) {
        const batch = dealIds.slice(i, i + batchSize);
        const { data: deals } = await supabase
          .from("deals")
          .select("id, value, assigned_to, funnel_id")
          .in("id", batch);
        (deals || []).forEach(d => {
          dealsMap[d.id] = { value: d.value, assigned_to: d.assigned_to, funnel_id: d.funnel_id };
        });
      }

      // Filter and group
      const grouped = new Map<string, Map<string, StageEntry>>();

      for (const entry of historyData) {
        const deal = dealsMap[entry.deal_id];
        if (!deal) continue;

        // Funnel filter
        if (selectedFunnelId !== "all" && deal.funnel_id !== selectedFunnelId) continue;

        // Role-based filter: vendedores see only their own
        if (role !== "admin" && deal.assigned_to !== currentUserId) continue;

        const metadata = entry.metadata as { from?: string; to?: string } | null;
        const stageTo = metadata?.to;
        if (!stageTo) continue;

        const dayKey = format(startOfDay(new Date(entry.created_at)), "yyyy-MM-dd");

        if (!grouped.has(dayKey)) grouped.set(dayKey, new Map());
        const dayMap = grouped.get(dayKey)!;

        if (!dayMap.has(stageTo)) {
          dayMap.set(stageTo, { count: 0, totalValue: 0, dealIds: new Set() });
        }

        const stageEntry = dayMap.get(stageTo)!;
        if (!stageEntry.dealIds.has(entry.deal_id)) {
          stageEntry.dealIds.add(entry.deal_id);
          stageEntry.count++;
          stageEntry.totalValue += deal.value || 0;
        }
      }

      // Flatten to array
      const result: { date: string; stage: string; count: number; totalValue: number }[] = [];
      const sortedDays = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

      for (const day of sortedDays) {
        const stages = grouped.get(day)!;
        const sortedStages = [...stages.keys()].sort();
        for (const stage of sortedStages) {
          const { count, totalValue } = stages.get(stage)!;
          result.push({ date: day, stage, count, totalValue });
        }
      }

      setStageHistory(result);
    } catch (err) {
      console.error("Error fetching stage history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [currentUserId, role, selectedFunnelId]);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);
  useEffect(() => { fetchDeals(); }, [fetchDeals]);
  useEffect(() => { fetchStageHistory(); }, [fetchStageHistory]);

  const filterBySearch = (deals: Deal[]) => {
    if (!search.trim()) return deals;
    const q = search.toLowerCase();
    return deals.filter(d => d.title.toLowerCase().includes(q));
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string) => format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  const formatDateDisplay = (dateStr: string) => format(new Date(dateStr + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });

  const renderTable = (deals: Deal[], showLossReason = false) => {
    const filtered = filterBySearch(deals);
    if (filtered.length === 0) {
      return <p className="text-muted-foreground text-center py-12">Nenhuma negociação encontrada.</p>;
    }
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Responsável</TableHead>
              {showLossReason && <TableHead>Motivo</TableHead>}
              <TableHead>Criação</TableHead>
              <TableHead>Atualização</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(deal => (
              <TableRow key={deal.id}>
                <TableCell className="font-medium">{deal.title}</TableCell>
                <TableCell>{formatCurrency(deal.value)}</TableCell>
                <TableCell>{deal.assigned_to ? profilesMap[deal.assigned_to] || "—" : "Sem responsável"}</TableCell>
                {showLossReason && (
                  <TableCell>
                    {(deal as any).loss_reason ? (
                      <Badge variant="outline">{(deal as any).loss_reason}</Badge>
                    ) : "—"}
                  </TableCell>
                )}
                <TableCell>{formatDate(deal.created_at)}</TableCell>
                <TableCell>{formatDate(deal.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderStageHistory = () => {
    if (historyLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (stageHistory.length === 0) {
      return <p className="text-muted-foreground text-center py-12">Nenhum histórico de movimentação encontrado.</p>;
    }

    // Group rows by date for visual separation
    let lastDate = "";

    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead className="text-right">Qtd. Negociações</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stageHistory.map((row, i) => {
              const showDate = row.date !== lastDate;
              lastDate = row.date;
              return (
                <TableRow key={`${row.date}-${row.stage}`} className={showDate && i > 0 ? "border-t-2 border-border" : ""}>
                  <TableCell className="font-medium">
                    {showDate ? formatDateDisplay(row.date) : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalValue)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="flex gap-6 p-6 h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Resultados</h1>
          <div className="flex items-center gap-3 ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar negociação..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-60"
              />
            </div>
            <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos os funis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funis</SelectItem>
                {funnels.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="sold">
            <TabsList>
              <TabsTrigger value="sold" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Vendidas
                <Badge variant="secondary" className="ml-1">{filterBySearch(soldDeals).length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="lost" className="gap-2">
                <XCircle className="h-4 w-4" />
                Perdidas
                <Badge variant="secondary" className="ml-1">{filterBySearch(lostDeals).length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="archived" className="gap-2">
                <Archive className="h-4 w-4" />
                Arquivadas
                <Badge variant="secondary" className="ml-1">{filterBySearch(archivedDeals).length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sold">{renderTable(soldDeals)}</TabsContent>
            <TabsContent value="lost">{renderTable(lostDeals, true)}</TabsContent>
            <TabsContent value="archived">{renderTable(archivedDeals)}</TabsContent>
          </Tabs>
        )}
      </div>

      {/* Side panel - Stage History */}
      <div className="w-80 shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Histórico por Etapa</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-10rem)]">
          {renderStageHistory()}
        </ScrollArea>
      </div>
    </div>
  );
}
