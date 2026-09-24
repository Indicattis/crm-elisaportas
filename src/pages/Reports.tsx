import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CalendarIcon, FileText, Printer, BarChart3, UserSquare2 } from "lucide-react";
import { format, startOfMonth, endOfDay, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
  column_type?: string;
}

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [sellerIds, setSellerIds] = useState<string[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactColumns, setContactColumns] = useState<ContactColumn[]>([]);
  const [selectedContactColumn, setSelectedContactColumn] = useState("all");

  // Filters
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedFunnel, setSelectedFunnel] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedChartStage, setSelectedChartStage] = useState("all");
  const [activeTab, setActiveTab] = useState("period");
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    const from = startOfDay(dateFrom).toISOString();
    const to = endOfDay(dateTo).toISOString();

    const [dealsRes, funnelsRes, profilesRes, rolesRes, channelsRes, contactsRes, contactColsRes] = await Promise.all([
      supabase.from("deals").select("*"),
      supabase.from("funnels").select("id, name"),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("user_roles").select("user_id").eq("role", "vendedor"),
      supabase.from("acquisition_channels").select("id, name"),
      supabase.from("contacts" as any).select("id, name, phone, state, city, notes, created_at, column_id, funnel_id").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }),
      supabase.from("funnel_columns").select("id, name, funnel_id, column_type").order("position"),
    ]);

    setDeals(dealsRes.data || []);
    setFunnels(funnelsRes.data || []);
    setSellerIds((rolesRes.data || []).map((role) => role.user_id));
    setChannels(channelsRes.data || []);
    setContacts(((contactsRes.data as any) || []) as ContactRow[]);
    setContactColumns(((contactColsRes.data as any) || []).map((c: any) => ({ id: c.id, name: c.name, funnel_id: c.funnel_id, column_type: c.column_type })));

    const map: Record<string, string> = {};
    (profilesRes.data || []).forEach((p) => {
      map[p.id] = p.full_name || p.id;
    });
    setProfiles(map);
    setLoading(false);
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const updatedAt = new Date(d.updated_at);
      if (updatedAt < startOfDay(dateFrom) || updatedAt > endOfDay(dateTo)) return false;
      if (selectedFunnel !== "all" && d.funnel_id !== selectedFunnel) return false;
      if (selectedUser !== "all" && d.assigned_to !== selectedUser && d.user_id !== selectedUser) return false;
      if (selectedStatus !== "all" && d.status !== selectedStatus) return false;
      if (selectedChannel !== "all" && d.acquisition_channel !== selectedChannel) return false;
      return true;
    });
  }, [deals, dateFrom, dateTo, selectedFunnel, selectedUser, selectedStatus, selectedChannel]);

  const dealStatuses = useMemo(
    () => Array.from(new Set(deals.map((deal) => deal.status).filter(Boolean))).sort(),
    [deals]
  );

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

  const dealColumns = useMemo(
    () => contactColumns.filter((column) => column.column_type === "deals" && (selectedFunnel === "all" || column.funnel_id === selectedFunnel)),
    [contactColumns, selectedFunnel]
  );

  const chartData = useMemo(() => {
    const filteredForChart = deals.filter((deal) => {
      if (selectedFunnel !== "all" && deal.funnel_id !== selectedFunnel) return false;
      if (selectedUser !== "all" && deal.assigned_to !== selectedUser && deal.user_id !== selectedUser) return false;
      if (selectedStatus !== "all" && deal.status !== selectedStatus) return false;
      if (selectedChannel !== "all" && deal.acquisition_channel !== selectedChannel) return false;
      return true;
    });

    if (startOfDay(dateFrom) > startOfDay(dateTo)) return [];

    return eachDayOfInterval({ start: startOfDay(dateFrom), end: startOfDay(dateTo) }).map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const leads = filteredForChart.filter((deal) =>
        (selectedChartStage === "all" || deal.status === selectedChartStage)
        && format(new Date(deal.created_at), "yyyy-MM-dd") === key
      ).length;
      const closedValue = filteredForChart
        .filter((deal) => deal.status === "Vendido" && deal.sold_at && format(new Date(deal.sold_at), "yyyy-MM-dd") === key)
        .reduce((sum, deal) => sum + (deal.value || 0), 0);
      return { date: format(day, "dd/MM"), fullDate: format(day, "dd/MM/yyyy"), leads, closedValue };
    });
  }, [deals, dateFrom, dateTo, selectedFunnel, selectedUser, selectedStatus, selectedChannel, selectedChartStage]);

  const chartConfig = {
    closedValue: { label: "Valor fechado", color: "hsl(var(--success))" },
    leads: { label: "Quantidade de leads", color: "hsl(var(--primary))" },
  };


  const filtersLabel = () => {
    const parts: string[] = [];
    parts.push(`Período: ${format(dateFrom, "dd/MM/yyyy")} a ${format(dateTo, "dd/MM/yyyy")}`);
    if (selectedFunnel !== "all") parts.push(`Funil: ${funnels.find((f) => f.id === selectedFunnel)?.name}`);
    if (selectedUser !== "all") parts.push(`Vendedor: ${profiles[selectedUser]}`);
    if (selectedStatus !== "all") parts.push(`Status: ${selectedStatus}`);
    if (selectedChannel !== "all") parts.push(`Canal: ${selectedChannel}`);
    if (activeTab === "period" && selectedChartStage !== "all") parts.push(`Etapa do gráfico: ${selectedChartStage}`);
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

  const getChartImage = async () => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return "";

    const clone = svg.cloneNode(true) as SVGSVGElement;
    const sourceElements = svg.querySelectorAll("*");
    const clonedElements = clone.querySelectorAll("*");
    sourceElements.forEach((element, index) => {
      const clonedElement = clonedElements[index];
      if (!clonedElement) return;
      const computed = window.getComputedStyle(element);
      ["fill", "stroke", "color", "font-family", "font-size"].forEach((property) => {
        const value = computed.getPropertyValue(property);
        if (value) clonedElement.setAttribute(property, value);
      });
    });
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serialized = new XMLSerializer().serializeToString(clone);
    const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    return await new Promise<string>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 480;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve("");
          return;
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => resolve("");
      image.src = source;
    });
  };

  const handlePrint = async () => {
    const title = tabTitles[activeTab];
    const filtersSummary = filtersLabel();
    const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    const chartImage = activeTab === "period" ? await getChartImage() : "";

    let tableHtml = "";

    if (activeTab === "period") {
      tableHtml = `
        ${chartImage ? `<div class="chart"><h2>Evolução diária</h2><img src="${chartImage}" alt="Gráfico de valor fechado e quantidade de leads" /></div>` : ""}
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
      .chart { margin: 14px 0 20px; break-inside: avoid; }
      .chart h2 { font-size: 14px; margin-bottom: 8px; }
      .chart img { display: block; width: 100%; max-height: 360px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; }
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

  const profileEntries = Object.entries(profiles).filter(([id]) => sellerIds.includes(id));

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Search type and filters */}
          <div className="glass rounded-2xl border border-border/60 p-5 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)] space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Buscar por</p>
              <TabsList className="grid h-11 w-full max-w-md grid-cols-2 bg-muted/60 p-1">
                <TabsTrigger value="period" className="gap-2">
                  <FileText className="h-4 w-4" />Negociações
                </TabsTrigger>
                <TabsTrigger value="contacts" className="gap-2">
                  <UserSquare2 className="h-4 w-4" />Contatos
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="border-t border-border/60 pt-4">
              <p className="mb-3 text-sm font-medium text-foreground">Filtros</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2 sm:col-span-2">
                  <DatePicker date={dateFrom} onChange={setDateFrom} label="Data início" />
                  <span className="text-muted-foreground text-sm">até</span>
                  <DatePicker date={dateTo} onChange={setDateTo} label="Data fim" />
                </div>
                <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                  <SelectTrigger className="w-full bg-background/60"><SelectValue placeholder="Funil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funis</SelectItem>
                {funnels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
                {activeTab === "period" && (
                  <>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="w-full bg-background/60"><SelectValue placeholder="Vendedor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os vendedores</SelectItem>
                        {profileEntries.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full bg-background/60"><SelectValue placeholder="Status da negociação" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        {dealStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                      <SelectTrigger className="w-full bg-background/60"><SelectValue placeholder="Canal de aquisição" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os canais</SelectItem>
                        {channels.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selectedChartStage} onValueChange={setSelectedChartStage}>
                      <SelectTrigger className="w-full bg-background/60"><SelectValue placeholder="Etapa do gráfico" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as etapas no gráfico</SelectItem>
                        {dealColumns.map((column) => <SelectItem key={column.id} value={column.name}>{column.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                )}
                {activeTab === "contacts" && (
                  <Select value={selectedContactColumn} onValueChange={setSelectedContactColumn}>
                    <SelectTrigger className="w-full bg-background/60"><SelectValue placeholder="Coluna de contatos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as colunas</SelectItem>
                  {contactColumns
                    .filter((c) => c.column_type === "contacts" && (selectedFunnel === "all" || c.funnel_id === selectedFunnel))
                    .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 pt-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <TabsContent value="period" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)]">
                  <div className="mb-4">
                    <h2 className="font-semibold text-foreground">Evolução diária</h2>
                    <p className="text-xs text-muted-foreground">Valor fechado e novos leads por data</p>
                  </div>
                  <ChartContainer ref={chartRef} config={chartConfig} className="h-[360px] w-full aspect-auto">
                    <LineChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis yAxisId="value" tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { notation: "compact" })}`} width={76} />
                      <YAxis yAxisId="leads" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                      <ChartTooltip
                        content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""} formatter={(value, name) => (
                          <div className="flex min-w-[180px] items-center justify-between gap-4">
                            <span className="text-muted-foreground">{name === "closedValue" ? "Valor fechado" : "Quantidade de leads"}</span>
                            <span className="font-medium text-foreground">{name === "closedValue" ? fmt(Number(value)) : Number(value).toLocaleString("pt-BR")}</span>
                          </div>
                        )} />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line yAxisId="value" type="monotone" dataKey="closedValue" stroke="var(--color-closedValue)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line yAxisId="leads" type="monotone" dataKey="leads" stroke="var(--color-leads)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ChartContainer>
                </div>
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

              <TabsContent value="contacts" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.1)] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cidade/Estado</TableHead>
                        <TableHead>Coluna</TableHead>
                        <TableHead>Funil</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum contato encontrado</TableCell></TableRow>
                      ) : filteredContacts.map((c) => {
                        const col = contactColumnMap[c.column_id];
                        const funnel = funnels.find((f) => f.id === c.funnel_id);
                        const loc = [c.city, c.state].filter(Boolean).join(" / ") || "-";
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.phone ? applyPhoneMask(c.phone) : "-"}</TableCell>
                            <TableCell>{loc}</TableCell>
                            <TableCell>{col?.name || "-"}</TableCell>
                            <TableCell>{funnel?.name || "-"}</TableCell>
                            <TableCell>{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/60 rounded-xl px-4 py-3 border border-border/40">
                  <span className="h-2 w-2 rounded-full bg-info" />
                  Total: <span className="font-semibold text-foreground">{filteredContacts.length}</span> contatos
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
