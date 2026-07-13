import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, CalendarIcon, DollarSign, User, Radio, Filter, ChevronRight } from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

const PAGE_SIZE = 10;

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const ACCENTS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ef4444", // red
  "#14b8a6", // teal
];

const accentFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

export default function Sales() {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { user: authUser } = useAuth();

  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [funnelMap, setFunnelMap] = useState<Record<string, string>>({});
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [page, setPage] = useState(1);

  // Lock seller filter for vendedor role
  useEffect(() => {
    if (role === "vendedor" && authUser?.id) {
      setSelectedSellerId(authUser.id);
    }
  }, [role, authUser]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedFunnelId, selectedSellerId, dateFrom, dateTo]);

  // Load funnels + sellers (only 'vendedor' role)
  useEffect(() => {
    (async () => {
      const [{ data: fData }, { data: rolesData }] = await Promise.all([
        supabase.from("funnels").select("id, name").order("position"),
        supabase.from("user_roles").select("user_id").eq("role", "vendedor"),
      ]);
      setFunnels(fData || []);
      const fMap: Record<string, string> = {};
      (fData || []).forEach((f) => (fMap[f.id] = f.name));
      setFunnelMap(fMap);

      const sellerIds = (rolesData || []).map((r) => r.user_id);
      if (sellerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", sellerIds)
          .order("full_name");
        setSellers((profs || []).map((p) => ({ id: p.id, name: p.full_name || "Sem nome" })));
      }
    })();
  }, []);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const fromISO = startOfDay(dateFrom).toISOString();
    const toISO = endOfDay(dateTo).toISOString();

    let q = supabase
      .from("deals")
      .select("*")
      .eq("status", "Vendido")
      .eq("archived", false)
      .gte("updated_at", fromISO)
      .lte("updated_at", toISO)
      .order("updated_at", { ascending: false });

    if (selectedFunnelId !== "all") q = q.eq("funnel_id", selectedFunnelId);
    if (selectedSellerId !== "all") q = q.eq("assigned_to", selectedSellerId);

    const { data } = await q;
    const list = data || [];
    setDeals(list);

    const assignedIds = [...new Set(list.filter((d) => d.assigned_to).map((d) => d.assigned_to as string))];
    if (assignedIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", assignedIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach((p) => (map[p.id] = p.full_name || "Sem nome"));
      setProfilesMap(map);
    } else {
      setProfilesMap({});
    }

    setLoading(false);
  }, [selectedFunnelId, selectedSellerId, dateFrom, dateTo]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return deals;
    return deals.filter(
      (d) =>
        (d.title || "").toLowerCase().includes(s) ||
        (d.phone || "").toLowerCase().includes(s),
    );
  }, [deals, search]);

  const totalValue = useMemo(
    () => filtered.reduce((acc, d) => acc + (d.value || 0), 0),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageDeals = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="glass rounded-xl p-3">
          <DollarSign className="h-6 w-6 text-success" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Todas as negociações concluídas como vendidas
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
            <SelectTrigger><SelectValue placeholder="Funil" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funis</SelectItem>
              {funnels.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSellerId}
            onValueChange={setSelectedSellerId}
            disabled={role === "vendedor"}
          >
            <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateFrom, "dd/MM/yy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(d) => d && setDateFrom(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateTo, "dd/MM/yy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(d) => d && setDateTo(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Total de vendas</div>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Valor total</div>
            <div className="text-2xl font-bold text-success">{fmtBRL(totalValue)}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />
            ))
          ) : pageDeals.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border/60">
              Nenhuma venda encontrada no período.
            </div>
          ) : (
            pageDeals.map((d, idx) => {
              const accent = accentFor(d.funnel_id || d.acquisition_channel || d.id);
              const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
              return (
                <div
                  key={d.id}
                  onClick={() => navigate(`/deal/${d.id}`)}
                  className="group relative flex items-stretch gap-3 rounded-2xl bg-card/70 hover:bg-card border border-border/60 shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12),0_1px_2px_-1px_hsl(var(--foreground)/0.08)] hover:shadow-[0_8px_24px_-8px_hsl(var(--foreground)/0.2),0_2px_6px_-2px_hsl(var(--foreground)/0.1)] hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden"
                >
                  {/* Colored accent bar */}
                  <div
                    className="w-1.5 shrink-0"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  />

                  {/* Index badge */}
                  <div className="flex items-center pl-3 pr-1">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold shadow-inner"
                      style={{
                        backgroundColor: `${accent}1F`,
                        color: accent,
                      }}
                    >
                      {String(globalIdx).padStart(2, "0")}
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 py-3 pr-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm md:text-base truncate">{d.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {d.assigned_to ? profilesMap[d.assigned_to] || "—" : "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {d.funnel_id ? funnelMap[d.funnel_id] || "—" : "—"}
                        </span>
                        {d.acquisition_channel && (
                          <span className="inline-flex items-center gap-1">
                            <Radio className="h-3 w-3" />
                            {d.acquisition_channel}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(d.updated_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Valor</div>
                        <div className="text-success font-bold text-sm md:text-base tabular-nums">
                          {fmtBRL(d.value || 0)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={page === i + 1}
                    onClick={() => setPage(i + 1)}
                    className="cursor-pointer"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
