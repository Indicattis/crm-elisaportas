import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Phone, MessageSquare, ClipboardList, Repeat } from "lucide-react";

interface TaskGroup {
  id: string;
  name: string;
  position: number;
}

interface TaskTemplate {
  id: string;
  group_id: string;
  type: string;
  description: string | null;
  deadline_hours: number;
  position: number;
  recurrence_type: string | null;
  recurrence_value: number | null;
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function formatDeadline(hours: number): string {
  if (hours < 24) return `${hours} hora${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  let str = `${days} dia${days !== 1 ? "s" : ""}`;
  if (remaining > 0) str += ` e ${remaining}h`;
  return str;
}

function typeLabel(type: string) {
  switch (type) {
    case "mensagem": return "Mensagem";
    case "ligacao": return "Ligação";
    default: return "Personalizada";
  }
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case "mensagem": return <MessageSquare className="h-4 w-4 text-primary" />;
    case "ligacao": return <Phone className="h-4 w-4 text-primary" />;
    default: return <ClipboardList className="h-4 w-4 text-primary" />;
  }
}

export function TaskGroupManager() {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const [taskGroupId, setTaskGroupId] = useState("");
  const [taskType, setTaskType] = useState("personalizada");
  const [taskDescription, setTaskDescription] = useState("");
  const [deadlineValue, setDeadlineValue] = useState(1);
  const [deadlineUnit, setDeadlineUnit] = useState<"hours" | "days">("days");
  const [saving, setSaving] = useState(false);
  // Recurrence modal state
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [recurrenceTask, setRecurrenceTask] = useState<TaskTemplate | null>(null);
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"interval" | "weekday" | "monthday">("interval");
  const [recurrenceValue, setRecurrenceValue] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<"hours" | "days">("days");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [gRes, tRes] = await Promise.all([
      supabase.from("task_groups").select("*").order("position"),
      supabase.from("task_templates").select("*").order("position"),
    ]);
    if (gRes.error) toast({ title: "Erro", description: gRes.error.message, variant: "destructive" });
    if (tRes.error) toast({ title: "Erro", description: tRes.error.message, variant: "destructive" });
    setGroups((gRes.data as TaskGroup[]) || []);
    setTemplates((tRes.data as TaskTemplate[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNewGroup = () => { setEditingGroup(null); setGroupName(""); setGroupDialogOpen(true); };
  const openEditGroup = (g: TaskGroup) => { setEditingGroup(g); setGroupName(g.name); setGroupDialogOpen(true); };

  const saveGroup = async () => {
    if (!groupName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (editingGroup) {
      const { error } = await supabase.from("task_groups").update({ name: groupName.trim() }).eq("id", editingGroup.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Grupo atualizado!" });
    } else {
      const { error } = await supabase.from("task_groups").insert({ name: groupName.trim(), user_id: user.id, position: groups.length });
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Grupo criado!" });
    }
    setSaving(false);
    setGroupDialogOpen(false);
    fetchData();
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Excluir este grupo e todas as suas tarefas?")) return;
    const { error } = await supabase.from("task_groups").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Grupo excluído!" }); fetchData(); }
  };

  const openNewTask = (groupId: string) => {
    setEditingTask(null);
    setTaskGroupId(groupId);
    setTaskType("personalizada");
    setTaskDescription("");
    setDeadlineValue(1);
    setDeadlineUnit("days");
    setTaskDialogOpen(true);
  };

  const openEditTask = (t: TaskTemplate) => {
    setEditingTask(t);
    setTaskGroupId(t.group_id);
    setTaskType(t.type);
    setTaskDescription(t.description || "");
    if (t.deadline_hours >= 24 && t.deadline_hours % 24 === 0) {
      setDeadlineValue(t.deadline_hours / 24);
      setDeadlineUnit("days");
    } else {
      setDeadlineValue(t.deadline_hours);
      setDeadlineUnit("hours");
    }
    setTaskDialogOpen(true);
  };

  const openRecurrence = (t: TaskTemplate) => {
    setRecurrenceTask(t);
    if (t.recurrence_type) {
      setIsRecurrent(true);
      setRecurrenceType(t.recurrence_type as "interval" | "weekday" | "monthday");
      if (t.recurrence_type === "interval" && t.recurrence_value) {
        if (t.recurrence_value >= 24 && t.recurrence_value % 24 === 0) {
          setRecurrenceValue(t.recurrence_value / 24);
          setRecurrenceUnit("days");
        } else {
          setRecurrenceValue(t.recurrence_value);
          setRecurrenceUnit("hours");
        }
      } else {
        setRecurrenceValue(t.recurrence_value || 1);
        setRecurrenceUnit("days");
      }
    } else {
      setIsRecurrent(false);
      setRecurrenceType("interval");
      setRecurrenceValue(1);
      setRecurrenceUnit("days");
    }
    setRecurrenceDialogOpen(true);
  };

  const saveRecurrence = async () => {
    if (!recurrenceTask) return;
    setSaving(true);
    const recType = isRecurrent ? recurrenceType : null;
    let recVal: number | null = null;
    if (isRecurrent) {
      if (recurrenceType === "interval") {
        recVal = recurrenceUnit === "days" ? recurrenceValue * 24 : recurrenceValue;
      } else {
        recVal = recurrenceValue;
      }
    }
    const { error } = await supabase.from("task_templates").update({
      recurrence_type: recType, recurrence_value: recVal,
    } as any).eq("id", recurrenceTask.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Recorrência atualizada!" });
    setSaving(false);
    setRecurrenceDialogOpen(false);
    fetchData();
  };

  const saveTask = async () => {
    if (taskType === "personalizada" && !taskDescription.trim()) {
      toast({ title: "Descrição obrigatória para tarefa personalizada", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const deadlineHours = deadlineUnit === "days" ? deadlineValue * 24 : deadlineValue;
    const desc = taskType === "personalizada" ? taskDescription.trim() : (taskType === "mensagem" ? "Enviar mensagem" : "Realizar ligação");

    if (editingTask) {
      const { error } = await supabase.from("task_templates").update({
        type: taskType, description: desc, deadline_hours: deadlineHours,
      } as any).eq("id", editingTask.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Tarefa atualizada!" });
    } else {
      const groupTemplates = templates.filter(t => t.group_id === taskGroupId);
      const { error } = await supabase.from("task_templates").insert({
        group_id: taskGroupId, user_id: user.id, type: taskType,
        description: desc, deadline_hours: deadlineHours, position: groupTemplates.length,
      } as any);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Tarefa criada!" });
    }
    setSaving(false);
    setTaskDialogOpen(false);
    fetchData();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    const { error } = await supabase.from("task_templates").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Tarefa excluída!" }); fetchData(); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        {[1, 2].map(i => (
          <Card key={i}><CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Grupos de Tarefas</h2>
        <Button size="sm" onClick={openNewGroup}>
          <Plus className="h-4 w-4 mr-1" /> Novo Grupo
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhum grupo de tarefas criado.</p>
      )}

      {groups.map(group => {
        const groupTasks = templates.filter(t => t.group_id === group.id);
        return (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{group.name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditGroup(group)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteGroup(group.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupTasks.length === 0 && (
                <p className="text-muted-foreground text-xs">Nenhuma tarefa neste grupo.</p>
              )}
              {groupTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between rounded-md border p-2.5 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <TypeIcon type={task.type} />
                    <div>
                      <span className="text-sm font-medium">{task.description || typeLabel(task.type)}</span>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
                        <span>{typeLabel(task.type)}</span>
                        <span>•</span>
                        <span>Prazo: {formatDeadline(task.deadline_hours)}</span>
                        {task.recurrence_type && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                              <Repeat className="h-3 w-3" />
                              Recorrente
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                   <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditTask(task)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className={`h-7 w-7 ${task.recurrence_type ? "text-primary" : "text-muted-foreground"}`} onClick={() => openRecurrence(task)}>
                      <Repeat className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full" onClick={() => openNewTask(group.id)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Nome do grupo</Label>
            <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Pós-venda" />
          </div>
          <DialogFooter>
            <Button onClick={saveGroup} disabled={saving || !groupName.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensagem">Mensagem</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="personalizada">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {taskType === "personalizada" && (
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="O que deve ser feito?" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Prazo após criação</Label>
              <div className="flex gap-2">
                <Input type="number" min={1} value={deadlineValue} onChange={e => setDeadlineValue(Math.max(1, parseInt(e.target.value) || 1))} className="w-24" />
                <Select value={deadlineUnit} onValueChange={(v) => setDeadlineUnit(v as "hours" | "days")}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hora(s)</SelectItem>
                    <SelectItem value="days">Dia(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Recorrente</Label>
                <Switch checked={isRecurrent} onCheckedChange={setIsRecurrent} />
              </div>

              {isRecurrent && (
                <div className="space-y-3 pl-1">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de recorrência</Label>
                    <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interval">Intervalo de tempo</SelectItem>
                        <SelectItem value="weekday">Dia da semana</SelectItem>
                        <SelectItem value="monthday">Dia do mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {recurrenceType === "interval" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Recriar a cada</Label>
                      <div className="flex gap-2">
                        <Input type="number" min={1} value={recurrenceValue} onChange={e => setRecurrenceValue(Math.max(1, parseInt(e.target.value) || 1))} className="w-24" />
                        <Select value={recurrenceUnit} onValueChange={(v) => setRecurrenceUnit(v as "hours" | "days")}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hora(s)</SelectItem>
                            <SelectItem value="days">Dia(s)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {recurrenceType === "weekday" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Dia da semana</Label>
                      <Select value={String(recurrenceValue)} onValueChange={(v) => setRecurrenceValue(parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((day, i) => (
                            <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {recurrenceType === "monthday" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Dia do mês</Label>
                      <Input type="number" min={1} max={31} value={recurrenceValue} onChange={e => setRecurrenceValue(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))} className="w-24" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveTask} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
