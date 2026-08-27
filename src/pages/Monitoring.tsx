import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/contexts/RoleContext";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarCheck, Check, X, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isSameDay } from "date-fns";

interface Seller {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface MonitoringRow {
  id: string;
  seller_id: string;
  date: string;
  completed: boolean;
  completed_time: string | null;
}

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseDateKey = (key: string): Date => {
  const [y, m, dd] = key.split("-").map(Number);
  return new Date(y, m - 1, dd);
};

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

export default function Monitoring() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === "admin";

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [rows, setRows] = useState<Record<string, MonitoringRow>>({});
  const [completedDates, setCompletedDates] = useState<Date[]>([]);
  const [incompleteDates, setIncompleteDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const today = useMemo(() => new Date(), []);

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
        .select("id, full_name, avatar_url")
        .in("id", ids)
        .order("full_name");
      let list: Seller[] = (profs || []).map((p) => ({
        id: p.id,
        name: p.full_name || "Sem nome",
        avatar_url: p.avatar_url,
      }));
      if (!isAdmin && user?.id) list = list.filter((s) => s.id === user.id);
      setSellers(list);
    })();
  }, [isAdmin, user?.id]);

  // Compute calendar day colors from all monitoring rows + active sellers count
  const fetchCalendarStates = useCallback(async () => {
    const { data } = await supabase
      .from("crm_monitoring" as any)
      .select("date, completed");

    const byDate = new Map<string, { total: number; done: number }>();
    (data || []).forEach((r: any) => {
      const cur = byDate.get(r.date) || { total: 0, done: 0 };
      cur.total += 1;
      if (r.completed) cur.done += 1;
      byDate.set(r.date, cur);
    });

    const totalSellers = sellers.length;
    const completed: Date[] = [];
    const incomplete: Date[] = [];

    byDate.forEach((counts, dateKey) => {
      const date = parseDateKey(dateKey);
      // A day is "completed" only when ALL active sellers marked done.
      // Use totalSellers when available (admin sees all); a single-seller view
      // (vendedor) uses its own list length.
      const target = totalSellers || counts.total;
      if (counts.done >= target && counts.total >= target) {
        completed.push(date);
      } else {
        incomplete.push(date);
      }
    });

    setCompletedDates(completed);
    setIncompleteDates(incomplete);
  }, [sellers.length]);

  useEffect(() => {
    fetchCalendarStates();
  }, [fetchCalendarStates]);

  // Day data: monitoring rows for the selected date
  const fetchDay = useCallback(async () => {
    setLoading(true);
    const { data: monRows } = await supabase
      .from("crm_monitoring" as any)
      .select("id, seller_id, date, completed, completed_time")
      .eq("date", dateKey);

    const map: Record<string, MonitoringRow> = {};
    (monRows || []).forEach((r: any) => {
      map[r.seller_id] = r as MonitoringRow;
    });
    setRows(map);
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
      }
    }
    setSavingId(null);
    fetchCalendarStates();
  };

  const completedCount = sellers.filter((s) => rows[s.id]?.completed).length;

  // Today is blue only if it has no monitoring records
  const todayEmpty = useMemo(() => {
    const todayKey = toDateKey(today);
    const hasRecord = completedDates.some((d) => isSameDay(d, today)) || incompleteDates.some((d) => isSameDay(d, today));
    return !hasRecord;
  }, [today, completedDates, incompleteDates]);

  const todayModifier = useMemo(
    () => (todayEmpty ? [today] : []),
    [todayEmpty, today],
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
              modifiers={{
                completed: completedDates,
                incomplete: incompleteDates,
                todayEmpty: todayModifier,
              }}
              modifiersClassNames={{
                completed:
                  "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white font-semibold",
                incomplete:
                  "bg-red-500 text-white hover:bg-red-600 hover:text-white font-semibold",
                todayEmpty:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold ring-2 ring-primary/40",
              }}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 px-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> Concluído
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500" /> Não concluído
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-primary" /> Dia atual
              </span>
            </div>
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
                  const done = row?.completed === true;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors",
                        done ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card/50",
                      )}
                    >
                      <div className="flex min-w-[180px] flex-1 items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          {s.avatar_url ? (
                            <AvatarImage src={s.avatar_url} alt={s.name} />
                          ) : null}
                          <AvatarFallback className="text-sm bg-primary/10 text-primary">
                            {getInitials(s.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {done
                              ? `CRM concluído${row?.completed_time ? ` às ${row.completed_time.slice(0, 5)}` : ""}`
                              : "CRM não concluído"}
                          </p>
                        </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
