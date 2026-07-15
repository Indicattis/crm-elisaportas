import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, FileText, Printer, BarChart3, TrendingUp, Users, Target, DollarSign, Percent, Package, ShoppingCart, XCircle, UserSquare2 } from "lucide-react";
import { format, startOfMonth, endOfDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { applyPhoneMask } from "@/lib/phone-mask";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

interface ContactRow {
  id: string;
  name: string;
  phone: string | null;
  state: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
  column_id: string;
  funnel_id: string;
}

interface ContactColumn {
  id: string;
  name: string;
  funnel_id: string;
}

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactColumns, setContactColumns] = useState<ContactColumn[]>([]);
  const [selectedContactColumn, setSelectedContactColumn] = useState("all");

  // Filters
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedFunnel, setSelectedFunnel] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedLossReason, setSelectedLossReason] = useState("all");
  const [activeTab, setActiveTab] = useState("period");

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    const from = startOfDay(dateFrom).toISOString();
    const to = endOfDay(dateTo).toISOString();

    const [dealsRes, funnelsRes, profilesRes, channelsRes, contactsRes, contactColsRes] = await Promise.all([
      supabase.from("deals").select("*").gte("updated_at", from).lte("updated_at", to),
      supabase.from("funnels").select("id, name"),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("acquisition_channels").select("id, name"),
      supabase.from("contacts" as any).select("id, name, phone, state, city, notes, created_at, column_id, funnel_id").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }),
      supabase.from("funnel_columns").select("id, name, funnel_id, column_type").eq("column_type", "contacts" as any),
    ]);

    setDeals(dealsRes.data || []);
    setFunnels(funnelsRes.data || []);
    setChannels(channelsRes.data || []);
    setContacts(((contactsRes.data as any) || []) as ContactRow[]);
    setContactColumns(((contactColsRes.data as any) || []).map((c: any) => ({ id: c.id, name: c.name, funnel_id: c.funnel_id })));

    const map: Record<string, string> = {};
    (profilesRes.data || []).forEach((p) => {
      map[p.id] = p.full_name || p.id;
    });
    setProfiles(map);
    setLoading(false);
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (selectedFunnel !== "all" && d.funnel_id !== selectedFunnel) return false;
      if (selectedUser !== "all" && d.assigned_to !== selectedUser && d.user_id !== selectedUser) return false;
      if (selectedChannel !== "all" && d.acquisition_channel !== selectedChannel) return false;
      if (selectedLossReason !== "all") {
        const reason = (d as any).loss_reason;
        if (selectedLossReason === "__none__") {
          if (d.status === "Perdido" && reason) return false;
        } else if (reason !== selectedLossReason) return false;
      }
      return true;
    });
  }, [deals, selectedFunnel, selectedUser, selectedChannel, selectedLossReason]);

  const lossReasons = useMemo(() => {
    const set = new Set<string>();
    deals.forEach((d) => {
      const r = (d as any).loss_reason;
      if (r) set.add(r);
    });
    return Array.from(set).sort();
  }, [deals]);

  const soldDeals = useMemo(() => filteredDeals.filter((d) => d.status === "Vendido"), [filteredDeals]);
  const lostDeals = useMemo(() => filteredDeals.filter((d) => d.status === "Perdido"), [filteredDeals]);

  const kpis = useMemo(() => {
    const totalSold = soldDeals.reduce((s, d) => s + (d.value || 0), 0);
    const totalLost = lostDeals.reduce((s, d) => s + (d.value || 0), 0);
    const total = soldDeals.length + lostDeals.length;
    const conversionRate = total > 0 ? (soldDeals.length / total) * 100 : 0;
    const avgTicket = soldDeals.length > 0 ? totalSold / soldDeals.length : 0;
    return { totalSold, totalLost, conversionRate, avgTicket, soldCount: soldDeals.length, lostCount: lostDeals.length, totalDeals: filteredDeals.length };
  }, [soldDeals, lostDeals, filteredDeals]);

  const byUser = useMemo(() => {
    const map: Record<string, { name: string; sold: number; lost: number; totalValue: number; count: number }> = {};
    filteredDeals.forEach((d) => {
      const uid = d.assigned_to || d.user_id;
      if (!map[uid]) map[uid] = { name: profiles[uid] || "Sem responsável", sold: 0, lost: 0, totalValue: 0, count: 0 };
      map[uid].count++;
      if (d.status === "Vendido") { map[uid].sold++; map[uid].totalValue += d.value || 0; }
      if (d.status === "Perdido") map[uid].lost++;
    });
    return Object.values(map).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredDeals, profiles]);

  const byChannel = useMemo(() => {
    const map: Record<string, { name: string; count: number; sold: number; totalValue: number }> = {};
    filteredDeals.forEach((d) => {
      const ch = d.acquisition_channel || "Sem canal";
      if (!map[ch]) map[ch] = { name: ch, count: 0, sold: 0, totalValue: 0 };
      map[ch].count++;
      if (d.status === "Vendido") { map[ch].sold++; map[ch].totalValue += d.value || 0; }
    });
    return Object.values(map).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredDeals]);

  const contactColumnMap = useMemo(() => {
    const m: Record<string, ContactColumn> = {};
    contactColumns.forEach((c) => { m[c.id] = c; });
    return m;
  }, [contactColumns]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (selectedContactColumn !== "all" && c.column_id !== selectedContactColumn) return false;
      if (selectedFunnel !== "all" && c.funnel_id !== selectedFunnel) return false;
      return true;
    });
  }, [contacts, selectedContactColumn, selectedFunnel]);


  const filtersLabel = () => {
    const parts: string[] = [];
    parts.push(`Período: ${format(dateFrom, "dd/MM/yyyy")} a ${format(dateTo, "dd/MM/yyyy")}`);
    if (selectedFunnel !== "all") parts.push(`Funil: ${funnels.find((f) => f.id === selectedFunnel)?.name}`);
    if (selectedUser !== "all") parts.push(`Vendedor: ${profiles[selectedUser]}`);
    if (selectedChannel !== "all") parts.push(`Canal: ${selectedChannel}`);
    if (selectedLossReason !== "all") parts.push(`Motivo da perda: ${selectedLossReason === "__none__" ? "Sem motivo" : selectedLossReason}`);
    if (activeTab === "contacts" && selectedContactColumn !== "all") {
      parts.push(`Coluna: ${contactColumnMap[selectedContactColumn]?.name || "-"}`);
    }
    return parts.join(" | ");
  };

  const tabTitles: Record<string, string> = {
    period: "Negociações por Período",
    performance: "Resumo de Desempenho",
    seller: "Relatório por Vendedor",
    channel: "Relatório por Canal de Aquisição",
    contacts: "Contatos Cadastrados",
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handlePrint = () => {
    const title = tabTitles[activeTab];
    const filtersSummary = filtersLabel();
    const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

    let tableHtml = "";

    if (activeTab === "period") {
      tableHtml = `
        <table>
          <thead><tr><th>Nº</th><th>Título</th><th>Telefone</th><th>Valor</th><th>Status</th><th>Motivo da perda</th><th>Responsável</th><th>Atualizado em</th></tr></thead>
          <tbody>
            ${filteredDeals.map((d) => `
              <tr>
                <td>${d.deal_number || "-"}</td>
                <td>${d.title}</td>
                <td>${d.phone ? applyPhoneMask(d.phone) : "-"}</td>
                <td>${fmt(d.value || 0)}</td>
                <td>${d.status}</td>
                <td>${(d as any).loss_reason || "-"}</td>
                <td>${profiles[d.assigned_to || d.user_id] || "-"}</td>
                <td>${format(new Date(d.updated_at), "dd/MM/yyyy")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p class="total">Total de negociações: ${filteredDeals.length} | Valor total: ${fmt(filteredDeals.reduce((s, d) => s + (d.value || 0), 0))}</p>
      `;
    } else if (activeTab === "performance") {
      tableHtml = `
        <div class="kpis">
          <div class="kpi"><span class="kpi-label">Total de Negociações</span><span class="kpi-value">${kpis.totalDeals}</span></div>
          <div class="kpi"><span class="kpi-label">Vendidas</span><span class="kpi-value">${kpis.soldCount}</span></div>
          <div class="kpi"><span class="kpi-label">Perdidas</span><span class="kpi-value">${kpis.lostCount}</span></div>
          <div class="kpi"><span class="kpi-label">Total Vendido</span><span class="kpi-value">${fmt(kpis.totalSold)}</span></div>
          <div class="kpi"><span class="kpi-label">Total Perdido</span><span class="kpi-value">${fmt(kpis.totalLost)}</span></div>
          <div class="kpi"><span class="kpi-label">Taxa de Conversão</span><span class="kpi-value">${kpis.conversionRate.toFixed(1)}%</span></div>
          <div class="kpi"><span class="kpi-label">Ticket Médio</span><span class="kpi-value">${fmt(kpis.avgTicket)}</span></div>
        </div>
      `;
    } else if (activeTab === "seller") {
      tableHtml = `
        <table>
          <thead><tr><th>Vendedor</th><th>Negociações</th><th>Vendidas</th><th>Perdidas</th><th>Valor Total</th><th>Conversão</th></tr></thead>
          <tbody>
            ${byUser.map((u) => `
              <tr>
                <td>${u.name}</td>
                <td>${u.count}</td>
                <td>${u.sold}</td>
                <td>${u.lost}</td>
                <td>${fmt(u.totalValue)}</td>
                <td>${u.sold + u.lost > 0 ? ((u.sold / (u.sold + u.lost)) * 100).toFixed(1) : 0}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (activeTab === "channel") {
      tableHtml = `
        <table>
          <thead><tr><th>Canal</th><th>Negociações</th><th>Vendidas</th><th>Valor Total</th></tr></thead>
          <tbody>
            ${byChannel.map((c) => `
              <tr>
                <td>${c.name}</td>
                <td>${c.count}</td>
                <td>${c.sold}</td>
                <td>${fmt(c.totalValue)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (activeTab === "contacts") {
      tableHtml = `
        <table>
          <thead><tr><th>Nome</th><th>Telefone</th><th>Cidade/Estado</th><th>Coluna</th><th>Funil</th><th>Cadastrado em</th></tr></thead>
          <tbody>
            ${filteredContacts.map((c) => {
              const col = contactColumnMap[c.column_id];
              const funnel = funnels.find((f) => f.id === c.funnel_id);
              const loc = [c.city, c.state].filter(Boolean).join(" / ") || "-";
              return `
                <tr>
                  <td>${c.name}</td>
                  <td>${c.phone ? applyPhoneMask(c.phone) : "-"}</td>
                  <td>${loc}</td>
                  <td>${col?.name || "-"}</td>
                  <td>${funnel?.name || "-"}</td>
                  <td>${format(new Date(c.created_at), "dd/MM/yyyy")}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
        <p class="total">Total de contatos: ${filteredContacts.length}</p>
      `;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 12px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { font-size: 18px; }
      .header .meta { text-align: right; font-size: 10px; color: #666; }
      .filters { background: #f5f5f5; padding: 8px 12px; border-radius: 4px; margin-bottom: 16px; font-size: 11px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
      th { background: #f0f0f0; font-weight: 600; }
      tr:nth-child(even) { background: #fafafa; }
      .total { margin-top: 12px; font-weight: 600; font-size: 13px; }
      .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 12px; }
      .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; }
      .kpi-label { display: block; font-size: 11px; color: #666; margin-bottom: 4px; }
      .kpi-value { display: block; font-size: 20px; font-weight: 700; }
      @media print { body { padding: 15px; } }
    </style></head><body>
      <div class="header">
        <h1>${title}</h1>
        <div class="meta">Gerado em: ${now}</div>
      </div>
      <div class="filters">${filtersSummary}</div>
      ${tableHtml}
      <script>window.onload = function() { window.print(); }</script>
    </body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const DatePicker = ({ date, onChange, label }: { date: Date; onChange: (d: Date) => void; label: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal bg-background/60 hover:bg-background/80", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => d && onChange(d)} locale={ptBR} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  const profileEntries = Object.entries(profiles);

  const kpiCards = [
    { label: "Total de Negociações", value: kpis.totalDeals, icon: Package, color: "primary" },
    { label: "Vendidas", value: kpis.soldCount, icon: ShoppingCart, color: "success" },
    { label: "Perdidas", value: kpis.lostCount, icon: XCircle, color: "destructive" },
    { label: "Total Vendido", value: fmt(kpis.totalSold), icon: DollarSign, color: "success" },
    { label: "Total Perdido", value: fmt(kpis.totalLost), icon: DollarSign, color: "destructive" },
    { label: "Taxa de Conversão", value: `${kpis.conversionRate.toFixed(1)}%`, icon: Percent, color: "warning" },
    { label: "Ticket Médio", value: fmt(kpis.avgTicket), icon: TrendingUp, color: "info" },
  ];

  const colorMap: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    primary: { border: "border-l-primary", bg: "bg-primary/10", text: "text-primary", icon: "text-primary" },
    success: { border: "border-l-success", bg: "bg-success/10", text: "text-success", icon: "text-success" },
    destructive: { border: "border-l-destructive", bg: "bg-destructive/10", text: "text-destructive", icon: "text-destructive" },
    warning: { border: "border-l-warning", bg: "bg-warning/10", text: "text-warning", icon: "text-warning" },
    info: { border: "border-l-info", bg: "bg-info/10", text: "text-info", icon: "text-info" },
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/40">
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass rounded-2xl border border-border/60 p-5 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary ring-1 ring-primary/20">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
                <p className="text-xs text-muted-foreground">Gere relatórios em PDF para impressão</p>
              </div>
            </div>
            <Button onClick={handlePrint} className="gap-2 sm:ml-auto">
              <Printer className="h-4 w-4" />
              Gerar PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl border border-border/60 p-5 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)]">
          <div className="flex flex-wrap items-center gap-3">
            <DatePicker date={dateFrom} onChange={setDateFrom} label="Data início" />
            <span className="text-muted-foreground text-sm">até</span>
            <DatePicker date={dateTo} onChange={setDateTo} label="Data fim" />
            <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
              <SelectTrigger className="w-[180px] bg-background/60"><SelectValue placeholder="Funil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funis</SelectItem>
                {funnels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[180px] bg-background/60"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profileEntries.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-[180px] bg-background/60"><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                {channels.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedLossReason} onValueChange={setSelectedLossReason}>
              <SelectTrigger className="w-[200px] bg-background/60"><SelectValue placeholder="Motivo da perda" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motivos</SelectItem>
                <SelectItem value="__none__">Sem motivo</SelectItem>
                {lossReasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex-wrap h-auto p-1 bg-muted/60 rounded-xl">
            <TabsTrigger value="period" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4 text-primary" />Negociações
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4 text-success" />Desempenho
            </TabsTrigger>
            <TabsTrigger value="seller" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-4 w-4 text-info" />Por Vendedor
            </TabsTrigger>
            <TabsTrigger value="channel" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Target className="h-4 w-4 text-warning" />Por Canal
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="space-y-3 pt-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <TabsContent value="period" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Motivo da perda</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Atualizado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeals.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma negociação encontrada</TableCell></TableRow>
                      ) : filteredDeals.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.deal_number || "-"}</TableCell>
                          <TableCell className="font-medium">{d.title}</TableCell>
                          <TableCell>{d.phone ? applyPhoneMask(d.phone) : "-"}</TableCell>
                          <TableCell>{fmt(d.value || 0)}</TableCell>
                          <TableCell>{d.status}</TableCell>
                          <TableCell className={(d as any).loss_reason ? "text-destructive" : "text-muted-foreground"}>{(d as any).loss_reason || "-"}</TableCell>
                          <TableCell>{profiles[d.assigned_to || d.user_id] || "-"}</TableCell>
                          <TableCell>{format(new Date(d.updated_at), "dd/MM/yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/60 rounded-xl px-4 py-3 border border-border/40">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Total: <span className="font-semibold text-foreground">{filteredDeals.length}</span> negociações | Valor: <span className="font-semibold text-foreground">{fmt(filteredDeals.reduce((s, d) => s + (d.value || 0), 0))}</span>
                </div>
              </TabsContent>

              <TabsContent value="performance">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {kpiCards.map((kpi) => {
                    const colors = colorMap[kpi.color];
                    const Icon = kpi.icon;
                    return (
                      <div key={kpi.label} className={cn("rounded-2xl border border-border/60 bg-card p-4 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)] border-l-4", colors.border)}>
                        <div className="flex items-center gap-3">
                          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", colors.bg)}>
                            <Icon className={cn("h-4 w-4", colors.icon)} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs text-muted-foreground">{kpi.label}</p>
                            <p className={cn("text-xl font-bold", colors.text)}>{kpi.value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="seller" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Negociações</TableHead>
                        <TableHead>Vendidas</TableHead>
                        <TableHead>Perdidas</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Conversão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byUser.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem dados</TableCell></TableRow>
                      ) : byUser.map((u) => (
                        <TableRow key={u.name}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{u.count}</TableCell>
                          <TableCell className="text-success font-medium">{u.sold}</TableCell>
                          <TableCell className="text-destructive font-medium">{u.lost}</TableCell>
                          <TableCell className="font-medium">{fmt(u.totalValue)}</TableCell>
                          <TableCell>{u.sold + u.lost > 0 ? ((u.sold / (u.sold + u.lost)) * 100).toFixed(1) : 0}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="channel" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Canal</TableHead>
                        <TableHead>Negociações</TableHead>
                        <TableHead>Vendidas</TableHead>
                        <TableHead>Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byChannel.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem dados</TableCell></TableRow>
                      ) : byChannel.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.count}</TableCell>
                          <TableCell className="text-success font-medium">{c.sold}</TableCell>
                          <TableCell className="font-medium">{fmt(c.totalValue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
