import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, XCircle, Archive } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

export default function Results() {
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [soldDeals, setSoldDeals] = useState<Deal[]>([]);
  const [lostDeals, setLostDeals] = useState<Deal[]>([]);
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);
  useEffect(() => { fetchDeals(); }, [fetchDeals]);

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

  const renderTable = (deals: Deal[]) => {
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

  return (
    <div className="p-6 space-y-6">
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
          <TabsContent value="lost">{renderTable(lostDeals)}</TabsContent>
          <TabsContent value="archived">{renderTable(archivedDeals)}</TabsContent>
        </Tabs>
      )}
    </div>
  );
}
