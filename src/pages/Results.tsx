import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, TrendingUp, XCircle, Archive, History, CalendarIcon, DollarSign, User } from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/contexts/RoleContext";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("sold");

  // Date filters for deals (default: current month)
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  // Stage history state
  const [historyDate, setHistoryDate] = useState<Date>(new Date(Date.now() - 86400000));
  const [stageHistory, setStageHistory] = useState<{ date: string; stage: string; count: number; totalValue: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { role } = useUserRole();

  // Seller filter for history (admin only)
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Reset page on filter changes
  useEffect(() => { setPage(1); }, [search, selectedFunnelId, activeTab, dateFrom, dateTo]);

  const fetchFunnels = useCallback(async () => {
    const { data } = await supabase.from("funnels").select("id, name").order("position");
    setFunnels(data || []);
  }, []);

  // Fetch sellers for admin filter
  const fetchSellers = useCallback(async () => {
    if (role !== "admin") return;
    const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
    setSellers((data || []).map(p => ({ id: p.id, name: p.full_name || "Sem nome" })));
  }, [role]);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const fromISO = startOfDay(dateFrom).toISOString();
    const toISO = endOfDay(dateTo).toISOString();

    let soldQuery = supabase.from("deals").select("*").eq("status", "Vendido").eq("archived", false).gte("updated_at", fromISO).lte("updated_at", toISO);
    if (selectedFunnelId !== "all") soldQuery = soldQuery.eq("funnel_id", selectedFunnelId);
    const { data: sold } = await soldQuery.order("updated_at", { ascending: false });

    let lostQuery = supabase.from("deals").select("*").eq("status", "Perdida").eq("archived", false).gte("updated_at", fromISO).lte("updated_at", toISO);
    if (selectedFunnelId !== "all") lostQuery = lostQuery.eq("funnel_id", selectedFunnelId);
    const { data: lost } = await lostQuery.order("updated_at", { ascending: false });

    let archivedQuery = supabase.from("deals").select("*").eq("archived", true).gte("updated_at", fromISO).lte("updated_at", toISO);
    if (selectedFunnelId !== "all") archivedQuery = archivedQuery.eq("funnel_id", selectedFunnelId);
    const { data: archived } = await archivedQuery.order("updated_at", { ascending: false });

    setSoldDeals(sold || []);
    setLostDeals(lost || []);
    setArchivedDeals(archived || []);

    const allDeals = [...(sold || []), ...(lost || []), ...(archived || [])];
    const assignedIds = [...new Set(allDeals.filter(d => d.assigned_to).map(d => d.assigned_to as string))];
    if (assignedIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", assignedIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach(p => { map[p.id] = p.full_name || "Sem nome"; });
      setProfilesMap(map);
    }

    setLoading(false);
  }, [selectedFunnelId, dateFrom, dateTo]);

  const fetchStageHistory = useCallback(async () => {
    if (!currentUserId) return;
    setHistoryLoading(true);

    try {
      const dayStart = startOfDay(historyDate).toISOString();
      const dayEnd = endOfDay(historyDate).toISOString();

      const { data: historyData } = await supabase
        .from("deal_history")
        .select("deal_id, created_at, metadata")
        .eq("event_type", "column_change")
        .gte("created_at", dayStart)
        .lt("created_at", dayEnd)
        .order("created_at", { ascending: false });

      if (!historyData || historyData.length === 0) {
        setStageHistory([]);
        setHistoryLoading(false);
        return;
      }

      const dealIds = [...new Set(historyData.map(h => h.deal_id))];
      const batchSize = 50;
      const dealsMap: Record<string, { value: number | null; assigned_to: string | null; funnel_id: string | null }> = {};

      for (let i = 0; i < dealIds.length; i += batchSize) {
        const batch = dealIds.slice(i, i + batchSize);
        const { data: deals } = await supabase.from("deals").select("id, value, assigned_to, funnel_id").in("id", batch);
        (deals || []).forEach(d => {
          dealsMap[d.id] = { value: d.value, assigned_to: d.assigned_to, funnel_id: d.funnel_id };
        });
      }

      const stageMap = new Map<string, StageEntry>();

      for (const entry of historyData) {
        const deal = dealsMap[entry.deal_id];
        if (!deal) continue;
        if (selectedFunnelId !== "all" && deal.funnel_id !== selectedFunnelId) continue;
        if (role !== "admin" && deal.assigned_to !== currentUserId) continue;
        if (role === "admin" && selectedSellerId !== "all" && deal.assigned_to !== selectedSellerId) continue;

        const metadata = entry.metadata as { from?: string; to?: string } | null;
        const stageTo = metadata?.to;
        if (!stageTo) continue;

        if (!stageMap.has(stageTo)) {
          stageMap.set(stageTo, { count: 0, totalValue: 0, dealIds: new Set() });
        }

        const stageEntry = stageMap.get(stageTo)!;
        if (!stageEntry.dealIds.has(entry.deal_id)) {
          stageEntry.dealIds.add(entry.deal_id);
          stageEntry.count++;
          stageEntry.totalValue += deal.value || 0;
        }
      }

      const dayKey = format(historyDate, "yyyy-MM-dd");
      const result = [...stageMap.keys()].sort().map(stage => {
        const { count, totalValue } = stageMap.get(stage)!;
        return { date: dayKey, stage, count, totalValue };
      });

      setStageHistory(result);
    } catch (err) {
      console.error("Error fetching stage history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [currentUserId, role, selectedFunnelId, historyDate, selectedSellerId]);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);
  useEffect(() => { fetchSellers(); }, [fetchSellers]);
  useEffect(() => { fetchDeals(); }, [fetchDeals]);
  useEffect(() => { fetchStageHistory(); }, [fetchStageHistory]);

  const filterBySearch = (deals: Deal[]) => {
    if (!search.trim()) return deals;
    const q = search.toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return deals.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (qDigits && d.phone && d.phone.replace(/\D/g, "").includes(qDigits))
    );
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDateCell = (date: string) => format(new Date(date), "dd/MM/yyyy", { locale: ptBR });

  const renderDatePicker = (label: string, date: Date, onChange: (d: Date) => void) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(date, "dd/MM/yyyy", { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(d)}
          initialFocus
          className="p-3 pointer-events-auto"
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );

  const renderTable = (deals: Deal[], showLossReason = false) => {
    const filtered = filterBySearch(deals);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (filtered.length === 0) {
      return <p className="text-muted-foreground text-center py-12">Nenhuma negociação encontrada.</p>;
    }

    return (
      <div className="space-y-4">
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
              {paginated.map(deal => (
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
                  <TableCell>{formatDateCell(deal.created_at)}</TableCell>
                  <TableCell>{formatDateCell(deal.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={cn(page === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const elements = [];
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    elements.push(<PaginationItem key={`ellipsis-${p}`}><span className="px-2">…</span></PaginationItem>);
                  }
                  elements.push(
                    <PaginationItem key={p}>
                      <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                  return elements;
                })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className={cn(page === totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
    );
  };

  const renderStageHistory = () => {
    if (historyLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    if (stageHistory.length === 0) {
      return <p className="text-muted-foreground text-center py-8">Nenhum histórico de movimentação encontrado para este dia.</p>;
    }

    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Etapa</TableHead>
              <TableHead className="text-right">Qtd. Negociações</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stageHistory.map((row) => (
              <TableRow key={row.stage}>
                <TableCell>
                  <Badge variant="outline">{row.stage}</Badge>
                </TableCell>
                <TableCell className="text-right">{row.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.totalValue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Resultados</h1>
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {renderDatePicker("De", dateFrom, setDateFrom)}
          <span className="text-muted-foreground text-sm">até</span>
          {renderDatePicker("Até", dateTo, setDateTo)}
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

      {/* Deals Section */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
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

      {/* Stage History Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Histórico por Etapa</h2>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto">
            {role === "admin" && (
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {sellers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {renderDatePicker("Data", historyDate, setHistoryDate)}
          </div>
        </div>
        {renderStageHistory()}
      </div>
    </div>
  );
}
