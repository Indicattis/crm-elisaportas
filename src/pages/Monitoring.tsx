import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/contexts/RoleContext";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Check, X, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Seller {
  id: string;
  name: string;
}

interface MonitoringRow {
  id: string;
  seller_id: string;
  date: string;
  completed: boolean;
  completed_time: string | null;
}

type ColorCounts = { green: number; yellow: number; red: number };

const emptyCounts = (): ColorCounts => ({ green: 0, yellow: 0, red: 0 });

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

export default function Monitoring() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === "admin";

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [rows, setRows] = useState<Record<string, MonitoringRow>>({});
  const [filledDates, setFilledDates] = useState<Date[]>([]);
  const [counts, setCounts] = useState<Record<string, ColorCounts>>({});
  const [unassigned, setUnassigned] = useState<ColorCounts>(emptyCounts());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  // Sellers
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "vendedor");
      const ids = (roles || []).map((r) => r.user_id);
      if (!ids.length) {
        setSellers([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids)
        .order("full_name");
      let list: Seller[] = (profs || []).map((p) => ({ id: p.id, name: p.full_name || "Sem nome" }));
      if (!isAdmin && user?.id) list = list.filter((s) => s.id === user.id);
      setSellers(list);
    })();
  }, [isAdmin, user?.id]);

  // Days already filled (for calendar highlight)
  const fetchFilledDates = useCallback(async () => {
    const { data } = await supabase.from("crm_monitoring" as any).select("date");
    const uniq = new Set((data || []).map((r: any) => r.date));
    setFilledDates(
      Array.from(uniq).map((d) => {
        const [y, m, dd] = (d as string).split("-").map(Number);
        return new Date(y, m - 1, dd);
      }),
    );
  }, []);

  useEffect(() => {
    fetchFilledDates();
  }, [fetchFilledDates]);

  // Day data: monitoring rows + live color counts
  const fetchDay = useCallback(async () => {
    setLoading(true);

    const [{ data: monRows }, { data: colorRows }] = await Promise.all([
      supabase.from("crm_monitoring" as any).select("id, seller_id, date, completed, completed_time").eq("date", dateKey),
      supabase.from("deal_daily_color").select("deal_id, color").eq("date", dateKey),
    ]);

    const map: Record<string, MonitoringRow> = {};
    (monRows || []).forEach((r: any) => {
      map[r.seller_id] = r as MonitoringRow;
    });
    setRows(map);

    const colorList = (colorRows || []) as { deal_id: string; color: string }[];
    const dealIds = colorList.map((c) => c.deal_id);
    const owners: Record<string, string | null> = {};
    for (let i = 0; i < dealIds.length; i += 200) {
      const chunk = dealIds.slice(i, i + 200);
      if (!chunk.length) break;
      const { data: deals } = await supabase.from("deals").select("id, assigned_to").in("id", chunk);
      (deals || []).forEach((d: any) => {
        owners[d.id] = d.assigned_to ?? null;
      });
    }

    const perSeller: Record<string, ColorCounts> = {};
    const noOwner = emptyCounts();
    for (const c of colorList) {
      const color = c.color as keyof ColorCounts;
      if (color !== "green" && color !== "yellow" && color !== "red") continue;
      const owner = owners[c.deal_id] ?? null;
      if (!owner) {
        noOwner[color]++;
        continue;
      }
      if (!perSeller[owner]) perSeller[owner] = emptyCounts();
      perSeller[owner][color]++;
    }
    setCounts(perSeller);
    setUnassigned(noOwner);
    setLoading(false);
  }, [dateKey]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  const upsertRow = async (sellerId: string, patch: { completed?: boolean; completed_time?: string | null }) => {
    if (!isAdmin) return;
    const existing = rows[sellerId];
    const next = {
      completed: patch.completed ?? existing?.completed ?? false,
      completed_time: patch.completed_time !== undefined ? patch.completed_time : existing?.completed_time ?? null,
    };
    if (!next.completed) next.completed_time = null;

    setSavingId(sellerId);
    // optimistic
    setRows((prev) => ({
      ...prev,
      [sellerId]: { id: existing?.id ?? "temp", seller_id: sellerId, date: dateKey, ...next },
    }));

    if (existing?.id && existing.id !== "temp") {
      const { error } = await supabase
        .from("crm_monitoring" as any)
        .update({ ...next, updated_by: user?.id } as any)
        .eq("id", existing.id);
      if (error) toast.error("Erro ao salvar", { description: error.message });
    } else {
      const { data, error } = await supabase
        .from("crm_monitoring" as any)
        .insert({ seller_id: sellerId, date: dateKey, ...next, updated_by: user?.id } as any)
        .select("id, seller_id, date, completed, completed_time")
        .single();
      if (error) {
        toast.error("Erro ao salvar", { description: error.message });
      } else if (data) {
        setRows((prev) => ({ ...prev, [sellerId]: data as any as MonitoringRow }));
        fetchFilledDates();
      }
    }
    setSavingId(null);
  };

  const dayTotals = useMemo(() => {
    const t = emptyCounts();
    for (const s of sellers) {
      const c = counts[s.id];
      if (!c) continue;
      t.green += c.green;
      t.yellow += c.yellow;
      t.red += c.red;
    }
    if (isAdmin) {
      t.green += unassigned.green;
      t.yellow += unassigned.yellow;
      t.red += unassigned.red;
    }
    return t;
  }, [sellers, counts, unassigned, isAdmin]);

  const completedCount = sellers.filter((s) => rows[s.id]?.completed).length;

  const ColorPill = ({ color, value }: { color: keyof ColorCounts; value: number }) => (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          color === "green" && "bg-emerald-500",
          color === "yellow" && "bg-amber-400",
          color === "red" && "bg-red-500",
        )}
      />
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="glass-strong flex items-center gap-3 rounded-2xl p-5">
          <div className="rounded-xl bg-primary/10 p-3">
            <CalendarCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Monitoramento</h1>
            <p className="text-sm text-muted-foreground">
              Controle diário de conclusão do CRM por vendedor
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
          <div className="glass rounded-2xl p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              modifiers={{ filled: filledDates }}
              modifiersClassNames={{ filled: "font-bold text-primary underline underline-offset-4" }}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>

          <div className="glass space-y-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold capitalize">{formatDateLabel(selectedDate)}</h2>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? "Marque a conclusão do CRM e o horário" : "Visualização do seu registro"}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" />
                {completedCount}/{sellers.length} concluíram
              </Badge>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : sellers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                Nenhum vendedor encontrado.
              </div>
            ) : (
              <div className="space-y-3">
                {sellers.map((s) => {
                  const row = rows[s.id];
                  const c = counts[s.id] || emptyCounts();
                  const done = row?.completed === true;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors",
                        done ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card/50",
                      )}
                    >
                      <div className="min-w-[160px] flex-1">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {done
                            ? `CRM concluído${row?.completed_time ? ` às ${row.completed_time.slice(0, 5)}` : ""}`
                            : "CRM não concluído"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <ColorPill color="green" value={c.green} />
                        <ColorPill color="yellow" value={c.yellow} />
                        <ColorPill color="red" value={c.red} />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={done ? "default" : "outline"}
                          disabled={!isAdmin || savingId === s.id}
                          onClick={() =>
                            upsertRow(s.id, {
                              completed: true,
                              completed_time:
                                row?.completed_time ??
                                new Date().toTimeString().slice(0, 5),
                            })
                          }
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" /> Sim
                        </Button>
                        <Button
                          size="sm"
                          variant={row && !done ? "destructive" : "outline"}
                          disabled={!isAdmin || savingId === s.id}
                          onClick={() => upsertRow(s.id, { completed: false, completed_time: null })}
                          className="gap-1"
                        >
                          <X className="h-4 w-4" /> Não
                        </Button>
                        <Input
                          type="time"
                          value={row?.completed_time ? row.completed_time.slice(0, 5) : ""}
                          disabled={!isAdmin || !done || savingId === s.id}
                          onChange={(e) => upsertRow(s.id, { completed_time: e.target.value || null })}
                          className="w-[110px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-4">
              <span className="text-sm font-medium text-muted-foreground">Total de bolinhas no dia</span>
              <div className="flex items-center gap-1.5">
                <ColorPill color="green" value={dayTotals.green} />
                <ColorPill color="yellow" value={dayTotals.yellow} />
                <ColorPill color="red" value={dayTotals.red} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
