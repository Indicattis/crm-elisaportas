import { useEffect, useMemo, useState } from "react";
import { ListChecks, CheckCircle2, Circle } from "lucide-react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type TaskKey = "weekly_authorized" | "monthly_partners";

const TASKS: { key: TaskKey; label: string; cadence: "Semanal" | "Mensal" }[] = [
  { key: "weekly_authorized", label: "Chamar Autorizados e Serralheiros", cadence: "Semanal" },
  { key: "monthly_partners", label: "Chamar Parceiros", cadence: "Mensal" },
];

interface Completion {
  id: string;
  user_id: string;
  task_key: TaskKey;
  period_start: string;
  completed_at: string;
}

const fmtDate = (s: string) => format(new Date(s), "dd/MM/yyyy HH:mm", { locale: ptBR });
const fmtPeriod = (key: TaskKey, period: string) => {
  const d = new Date(period + "T00:00:00");
  return key === "weekly_authorized"
    ? `Semana de ${format(d, "dd/MM/yyyy", { locale: ptBR })}`
    : format(d, "MMMM/yyyy", { locale: ptBR });
};

export function RecurringTasksDialog() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [busyKey, setBusyKey] = useState<TaskKey | null>(null);

  const weekStart = useMemo(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"), []);
  const monthStart = useMemo(() => format(startOfMonth(new Date()), "yyyy-MM-dd"), []);
  const periodFor = (k: TaskKey) => (k === "weekly_authorized" ? weekStart : monthStart);

  const load = async () => {
    setLoading(true);
    const compRes = await supabase
      .from("recurring_task_completions")
      .select("*")
      .order("completed_at", { ascending: false })
      .limit(isAdmin ? 200 : 60);
    if (compRes.error) toast.error("Erro ao carregar tarefas");
    else setCompletions((compRes.data as Completion[]) ?? []);
    if (isAdmin) {
      const profRes = await supabase.from("profiles").select("id, full_name, email");
      if (!profRes.error) setProfiles(profRes.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const myCurrent = (k: TaskKey) =>
    completions.find((c) => c.user_id === user?.id && c.task_key === k && c.period_start === periodFor(k));

  const toggleMine = async (k: TaskKey) => {
    if (!user) return;
    setBusyKey(k);
    const existing = myCurrent(k);
    if (existing) {
      const { error } = await supabase.from("recurring_task_completions").delete().eq("id", existing.id);
      if (error) toast.error("Erro ao desmarcar");
      else toast.success("Tarefa desmarcada");
    } else {
      const { error } = await supabase.from("recurring_task_completions").insert({
        user_id: user.id,
        task_key: k,
        period_start: periodFor(k),
      });
      if (error) toast.error("Erro ao marcar");
      else toast.success("Tarefa concluída");
    }
    setBusyKey(null);
    load();
  };

  const profileName = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    return p?.full_name || p?.email || "Vendedor";
  };

  const adminCurrent = isAdmin
    ? profiles.map((p) => ({
        profile: p,
        cells: TASKS.map((t) => ({
          task: t,
          completion: completions.find(
            (c) => c.user_id === p.id && c.task_key === t.key && c.period_start === periodFor(t.key),
          ),
        })),
      }))
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ListChecks className="h-4 w-4" />
          Minhas tarefas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Tarefas Recorrentes
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current">
          <TabsList>
            <TabsTrigger value="current">Atuais</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            {!isAdmin ? (
              <div className="space-y-3">
                {TASKS.map((t) => {
                  const done = myCurrent(t.key);
                  return (
                    <div
                      key={t.key}
                      className="flex items-center justify-between rounded-lg border p-4 bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={!!done}
                          disabled={busyKey === t.key}
                          onCheckedChange={() => toggleMine(t.key)}
                        />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{t.cadence}</p>
                          <p className="font-medium">{t.label}</p>
                          {done && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Concluída em {fmtDate(done.completed_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ScrollArea className="h-[55vh] pr-2">
                <div className="space-y-2">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : adminCurrent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum vendedor cadastrado.</p>
                  ) : (
                    adminCurrent.map(({ profile, cells }) => (
                      <div key={profile.id} className="rounded-lg border p-3 bg-card">
                        <p className="font-medium mb-2">{profile.full_name || profile.email}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cells.map(({ task, completion }) => (
                            <div
                              key={task.key}
                              className="flex items-start gap-2 text-sm rounded-md bg-muted/40 p-2"
                            >
                              {completion ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground">{task.cadence}</p>
                                <p>{task.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {completion ? `Concluída em ${fmtDate(completion.completed_at)}` : "Pendente"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[55vh] pr-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : completions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conclusão registrada ainda.</p>
              ) : (
                <div className="space-y-1">
                  {completions.map((c) => {
                    const task = TASKS.find((t) => t.key === c.task_key);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm bg-card"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate">
                              <span className="font-medium">{task?.cadence}</span> — {task?.label}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {isAdmin && `${profileName(c.user_id)} · `}
                              {fmtPeriod(c.task_key, c.period_start)}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {fmtDate(c.completed_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
