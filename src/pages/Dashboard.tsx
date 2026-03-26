import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Trophy, XCircle, Percent, Receipt } from "lucide-react";

export default function Dashboard() {
  const [selectedFunnel, setSelectedFunnel] = useState<string>("all");

  const { data: funnels } = useQuery({
    queryKey: ["funnels"],
    queryFn: async () => {
      const { data } = await supabase.from("funnels").select("*").order("position");
      return data ?? [];
    },
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["dashboard-deals", selectedFunnel],
    queryFn: async () => {
      let q = supabase.from("deals").select("*");
      if (selectedFunnel !== "all") q = q.eq("funnel_id", selectedFunnel);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: columns } = useQuery({
    queryKey: ["dashboard-columns", selectedFunnel],
    queryFn: async () => {
      let q = supabase.from("funnel_columns").select("*");
      if (selectedFunnel !== "all") q = q.eq("funnel_id", selectedFunnel);
      const { data } = await q.order("position");
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
  });

  const kpis = useMemo(() => {
    if (!deals) return null;
    const active = deals.filter((d) => !d.archived && d.status !== "Vendido" && d.status !== "Perdida");
    const won = deals.filter((d) => d.status === "Vendido");
    const lost = deals.filter((d) => d.status === "Perdida");
    const pipelineValue = active.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const wonValue = won.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const conversionRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;
    const avgTicket = won.length > 0 ? wonValue / won.length : 0;

    return {
      activeCount: active.length,
      pipelineValue,
      wonCount: won.length,
      wonValue,
      lostCount: lost.length,
      conversionRate,
      avgTicket,
    };
  }, [deals]);

  const stageData = useMemo(() => {
    if (!deals || !columns) return [];
    const active = deals.filter((d) => !d.archived && d.status !== "Vendido" && d.status !== "Perdida");
    const countByStatus: Record<string, number> = {};
    active.forEach((d) => {
      countByStatus[d.status] = (countByStatus[d.status] || 0) + 1;
    });
    return columns
      .map((col) => ({
        name: col.name,
        value: countByStatus[col.name] || 0,
        color: col.color,
      }))
      .filter((d) => d.value > 0);
  }, [deals, columns]);

  const sellerData = useMemo(() => {
    if (!deals || !profiles) return [];
    const active = deals.filter((d) => !d.archived && d.status !== "Vendido" && d.status !== "Perdida");
    const countBySeller: Record<string, number> = {};
    active.forEach((d) => {
      const key = d.assigned_to || "unassigned";
      countBySeller[key] = (countBySeller[key] || 0) + 1;
    });
    const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
    return Object.entries(countBySeller).map(([id, count], i) => {
      const profile = profiles.find((p) => p.id === id);
      return {
        name: id === "unassigned" ? "Sem responsável" : profile?.full_name || "Desconhecido",
        value: count,
        color: colors[i % colors.length],
      };
    });
  }, [deals, profiles]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const stageChartConfig = Object.fromEntries(
    stageData.map((d) => [d.name, { label: d.name, color: d.color }])
  );
  const sellerChartConfig = Object.fromEntries(
    sellerData.map((d) => [d.name, { label: d.name, color: d.color }])
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Todos os funis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os funis</SelectItem>
            {funnels?.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {dealsLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Ativas", value: kpis.activeCount, icon: TrendingUp },
            { label: "Pipeline", value: fmt(kpis.pipelineValue), icon: DollarSign },
            { label: "Vendidas", value: `${kpis.wonCount} (${fmt(kpis.wonValue)})`, icon: Trophy },
            { label: "Perdidas", value: kpis.lostCount, icon: XCircle },
            { label: "Conversão", value: `${kpis.conversionRate.toFixed(1)}%`, icon: Percent },
            { label: "Ticket Médio", value: fmt(kpis.avgTicket), icon: Receipt },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="glass-strong">
              <CardContent className="flex flex-col gap-1 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <span className="text-lg font-bold truncate">{value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-base">Negociações por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            {stageData.length > 0 ? (
              <ChartContainer config={stageChartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stageData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-base">Negociações por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            {sellerData.length > 0 ? (
              <ChartContainer config={sellerChartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={sellerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {sellerData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
