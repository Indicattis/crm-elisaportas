import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Search, CalendarIcon, DollarSign } from "lucide-react";
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Funil</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pageDeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma venda encontrada no período.
                  </TableCell>
                </TableRow>
              ) : (
                pageDeals.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/deal/${d.id}`)}
                  >
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-success font-semibold">{fmtBRL(d.value || 0)}</TableCell>
                    <TableCell>{d.assigned_to ? profilesMap[d.assigned_to] || "—" : "—"}</TableCell>
                    <TableCell>{d.funnel_id ? funnelMap[d.funnel_id] || "—" : "—"}</TableCell>
                    <TableCell>{d.acquisition_channel || "—"}</TableCell>
                    <TableCell>{format(new Date(d.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
