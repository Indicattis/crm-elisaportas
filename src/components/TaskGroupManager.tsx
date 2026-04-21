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
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Pencil, Phone, MessageSquare, ClipboardList, Repeat, Layers, CalendarClock, X } from "lucide-react";

interface TaskGroup {
  id: string;
  name: string;
  position: number;
  schedule_mode?: string;
}

interface TaskGroupStage {
  id: string;
  group_id: string;
  name: string;
  color: string;
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
  stage_id: string | null;
}

interface TaskGroupSchedule {
  id: string;
  group_id: string;
  task_type: string;
  task_description: string | null;
  days: number[];
  time: string;
  position: number;
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

const DEFAULT_STAGES = [
  { name: "Etapa 1", color: "#22c55e", position: 0 },
  { name: "Etapa 2", color: "#eab308", position: 1 },
  { name: "Etapa 3", color: "#ef4444", position: 2 },
];

export function TaskGroupManager() {
  const { user: authUser } = useAuth();
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [stages, setStages] = useState<TaskGroupStage[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [schedules, setSchedules] = useState<TaskGroupSchedule[]>([]);
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
  const [taskStageId, setTaskStageId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  // Recurrence modal state
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [recurrenceTask, setRecurrenceTask] = useState<TaskTemplate | null>(null);
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"interval" | "weekday" | "monthday">("interval");
  const [recurrenceValue, setRecurrenceValue] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<"hours" | "days">("days");
  // Stage edit state
  const [editingStage, setEditingStage] = useState<TaskGroupStage | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState("#22c55e");
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [stageGroupId, setStageGroupId] = useState("");
  // Recurring schedule (per row in task_group_schedules) state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TaskGroupSchedule | null>(null);
  const [scheduleGroupId, setScheduleGroupId] = useState<string>("");
  const [scheduleType, setScheduleType] = useState<"mensagem" | "ligacao" | "personalizada">("personalizada");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"specific" | "until">("specific");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [scheduleDayInput, setScheduleDayInput] = useState("");
  const [scheduleUntil, setScheduleUntil] = useState(7);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [gRes, tRes, sRes, schRes] = await Promise.all([
      supabase.from("task_groups").select("*").order("position"),
      supabase.from("task_templates").select("*").order("position"),
      supabase.from("task_group_stages").select("*").order("position"),
      supabase.from("task_group_schedules" as any).select("*").order("position"),
    ]);
    if (gRes.error) toast({ title: "Erro", description: gRes.error.message, variant: "destructive" });
    if (tRes.error) toast({ title: "Erro", description: tRes.error.message, variant: "destructive" });
    setGroups((gRes.data as TaskGroup[]) || []);
    setTemplates((tRes.data as TaskTemplate[]) || []);
    setStages((sRes.data as TaskGroupStage[]) || []);
    setSchedules(((schRes.data as any) || []) as TaskGroupSchedule[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNewGroup = () => { setEditingGroup(null); setGroupName(""); setGroupDialogOpen(true); };
  const openEditGroup = (g: TaskGroup) => { setEditingGroup(g); setGroupName(g.name); setGroupDialogOpen(true); };

  const saveGroup = async () => {
    if (!groupName.trim()) return;
    setSaving(true);
    if (!authUser) { setSaving(false); return; }
    const user = authUser;

    if (editingGroup) {
      const { error } = await supabase.from("task_groups").update({ name: groupName.trim() }).eq("id", editingGroup.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Grupo atualizado!" });
    } else {
      const { data: newGroup, error } = await supabase.from("task_groups").insert({ name: groupName.trim(), user_id: user.id, position: groups.length }).select("id").single();
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Grupo criado!" });
        if (newGroup) {
          await supabase.from("task_group_stages").insert(
            DEFAULT_STAGES.map(s => ({ ...s, group_id: newGroup.id, user_id: user.id })) as any
          );
        }
      }
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

  // Toggle recurring mode at the group level
  const toggleRecurringMode = async (group: TaskGroup, enabled: boolean) => {
    const { error } = await supabase
      .from("task_groups")
      .update({ schedule_mode: enabled ? "recurring_days" : "manual" } as any)
      .eq("id", group.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchData();
  };

  // Stage CRUD
  const openNewStage = (groupId: string) => {
    setEditingStage(null);
    setStageGroupId(groupId);
    setStageName("");
    setStageColor("#6366f1");
    setStageDialogOpen(true);
  };

  const openEditStage = (s: TaskGroupStage) => {
    setEditingStage(s);
    setStageGroupId(s.group_id);
    setStageName(s.name);
    setStageColor(s.color);
    setStageDialogOpen(true);
  };

  const saveStage = async () => {
    if (!stageName.trim()) return;
    setSaving(true);
    if (!authUser) { setSaving(false); return; }
    const user = authUser;

    if (editingStage) {
      const { error } = await supabase.from("task_group_stages").update({ name: stageName.trim(), color: stageColor } as any).eq("id", editingStage.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Etapa atualizada!" });
    } else {
      const groupStages = stages.filter(s => s.group_id === stageGroupId);
      const { error } = await supabase.from("task_group_stages").insert({
        group_id: stageGroupId, user_id: user.id, name: stageName.trim(), color: stageColor, position: groupStages.length,
      } as any);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Etapa criada!" });
    }
    setSaving(false);
    setStageDialogOpen(false);
    fetchData();
  };

  const deleteStage = async (id: string) => {
    if (!confirm("Excluir esta etapa? Tarefas vinculadas ficarão sem etapa.")) return;
    const { error } = await supabase.from("task_group_stages").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Etapa excluída!" }); fetchData(); }
  };

  const openNewTask = (groupId: string) => {
    setEditingTask(null);
    setTaskGroupId(groupId);
    setTaskType("personalizada");
    setTaskDescription("");
    setDeadlineValue(1);
    setDeadlineUnit("days");
    setTaskStageId("");
    setTaskDialogOpen(true);
  };

  const openEditTask = (t: TaskTemplate) => {
    setEditingTask(t);
    setTaskGroupId(t.group_id);
    setTaskType(t.type);
    setTaskDescription(t.description || "");
    setTaskStageId(t.stage_id || "");
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
    if (!authUser) { setSaving(false); return; }
    const user = authUser;

    const deadlineHours = deadlineUnit === "days" ? deadlineValue * 24 : deadlineValue;
    const desc = taskType === "personalizada" ? taskDescription.trim() : (taskType === "mensagem" ? "Enviar mensagem" : "Realizar ligação");

    if (editingTask) {
      const { error } = await supabase.from("task_templates").update({
        type: taskType, description: desc, deadline_hours: deadlineHours, stage_id: taskStageId || null,
      } as any).eq("id", editingTask.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Tarefa atualizada!" });
    } else {
      const groupTemplates = templates.filter(t => t.group_id === taskGroupId);
      const { error } = await supabase.from("task_templates").insert({
        group_id: taskGroupId, user_id: user.id, type: taskType,
        description: desc, deadline_hours: deadlineHours, position: groupTemplates.length,
        stage_id: taskStageId || null,
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

  // Schedule (recurring task) CRUD
  const openNewSchedule = (groupId: string) => {
    setEditingSchedule(null);
    setScheduleGroupId(groupId);
    setScheduleType("personalizada");
    setScheduleDescription("");
    setScheduleMode("specific");
    setScheduleDays([]);
    setScheduleDayInput("");
    setScheduleUntil(7);
    setScheduleTime("09:00");
    setScheduleDialogOpen(true);
  };

  const openEditSchedule = (s: TaskGroupSchedule) => {
    setEditingSchedule(s);
    setScheduleGroupId(s.group_id);
    setScheduleType((s.task_type as any) || "personalizada");
    setScheduleDescription(s.task_description || "");
    const sorted = [...(s.days || [])].sort((a, b) => a - b);
    const isUntil = sorted.length > 0 && sorted.every((d, i) => d === i + 1);
    setScheduleMode(isUntil && sorted.length > 1 ? "until" : "specific");
    setScheduleDays(sorted);
    setScheduleUntil(isUntil ? sorted.length : 7);
    setScheduleTime((s.time || "09:00").slice(0, 5));
    setScheduleDayInput("");
    setScheduleDialogOpen(true);
  };

  const addScheduleDay = () => {
    const n = parseInt(scheduleDayInput);
    if (!n || n < 0 || n > 365) return;
    if (scheduleDays.includes(n)) { setScheduleDayInput(""); return; }
    setScheduleDays([...scheduleDays, n].sort((a, b) => a - b));
    setScheduleDayInput("");
  };

  const removeScheduleDay = (d: number) => {
    setScheduleDays(scheduleDays.filter(x => x !== d));
  };

  const saveSchedule = async () => {
    if (!scheduleGroupId || !authUser) return;
    const days = scheduleMode === "until"
      ? Array.from({ length: scheduleUntil }, (_, i) => i + 1)
      : [...scheduleDays].sort((a, b) => a - b);
    if (days.length === 0) {
      toast({ title: "Adicione pelo menos um dia", variant: "destructive" });
      return;
    }
    if (scheduleType === "personalizada" && !scheduleDescription.trim()) {
      toast({ title: "Descrição obrigatória para tarefa personalizada", variant: "destructive" });
      return;
    }
    setSaving(true);
    const desc = scheduleType === "personalizada"
      ? scheduleDescription.trim()
      : (scheduleType === "mensagem" ? "Enviar mensagem" : "Realizar ligação");

    const payload: any = {
      task_type: scheduleType,
      task_description: desc,
      days,
      time: scheduleTime + ":00",
    };

    if (editingSchedule) {
      const { error } = await supabase.from("task_group_schedules" as any).update(payload).eq("id", editingSchedule.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Agenda atualizada!" });
    } else {
      const groupSchedules = schedules.filter(s => s.group_id === scheduleGroupId);
      const { error } = await supabase.from("task_group_schedules" as any).insert({
        ...payload,
        group_id: scheduleGroupId,
        user_id: authUser.id,
        position: groupSchedules.length,
      });
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Agenda criada!" });
    }
    setSaving(false);
    setScheduleDialogOpen(false);
    fetchData();
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Excluir esta tarefa recorrente?")) return;
    const { error } = await supabase.from("task_group_schedules" as any).delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Tarefa recorrente excluída!" }); fetchData(); }
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
        const groupStages = stages.filter(s => s.group_id === group.id);
        const groupTasks = templates.filter(t => t.group_id === group.id);
        const groupSchedules = schedules.filter(s => s.group_id === group.id);
        const isRecurring = group.schedule_mode === "recurring_days";
        return (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {group.name}
                  {isRecurring && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <CalendarClock className="h-3 w-3" /> Agenda recorrente
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditGroup(group)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteGroup(group.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs cursor-pointer" htmlFor={`rec-${group.id}`}>
                    Agenda recorrente
                  </Label>
                </div>
                <Switch
                  id={`rec-${group.id}`}
                  checked={isRecurring}
                  onCheckedChange={(v) => toggleRecurringMode(group, v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isRecurring ? (
                <div className="space-y-2">
                  {groupSchedules.length === 0 && (
                    <p className="text-muted-foreground text-xs">
                      Nenhuma tarefa recorrente. Adicione a primeira abaixo.
                    </p>
                  )}
                  {groupSchedules.map(sch => (
                    <div key={sch.id} className="flex items-center justify-between rounded-md border p-2.5 bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <TypeIcon type={sch.task_type} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {sch.task_description || typeLabel(sch.task_type)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Dias: {sch.days.join(", ") || "—"} • {(sch.time || "09:00:00").slice(0, 5)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditSchedule(sch)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSchedule(sch.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => openNewSchedule(group.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Nova tarefa recorrente
                  </Button>
                </div>
              ) : (
                <>
                  {/* Stages section - compact editable list */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" /> Etapas
                      </span>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => openNewStage(group.id)}>
                        <Plus className="h-3 w-3 mr-0.5" /> Etapa
                      </Button>
                    </div>
                    {groupStages.length === 0 && (
                      <p className="text-muted-foreground text-[10px]">Nenhuma etapa. Crie etapas para categorizar as tarefas.</p>
                    )}
                    <div className="space-y-1">
                      {groupStages.map(stage => (
                        <div key={stage.id} className="flex items-center justify-between rounded-md border px-2 py-1 bg-muted/20">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                            <span className="text-xs font-medium truncate">{stage.name}</span>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditStage(stage)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteStage(stage.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Tasks section grouped by stage (mirrors DealDetailDialog) */}
                  {groupTasks.length === 0 && (
                    <p className="text-muted-foreground text-xs">Nenhuma tarefa neste grupo.</p>
                  )}
                  {(() => {
                    const renderTaskCard = (task: TaskTemplate) => (
                      <div key={task.id} className="flex items-center justify-between rounded-md border p-2.5 bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <TypeIcon type={task.type} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {task.description || typeLabel(task.type)}
                            </div>
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
                        <div className="flex gap-1 shrink-0">
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
                    );

                    if (groupStages.length > 0) {
                      const unstaged = groupTasks.filter(t => !t.stage_id);
                      return (
                        <div className="space-y-3">
                          {groupStages.map(stage => {
                            const stageTasks = groupTasks.filter(t => t.stage_id === stage.id);
                            if (stageTasks.length === 0) return null;
                            return (
                              <div key={stage.id} className="flex gap-0">
                                <div className="flex flex-col items-center shrink-0 mr-2.5">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: stage.color }} />
                                  <div className="flex-1 w-0.5 rounded-full min-h-[8px]" style={{ backgroundColor: stage.color, opacity: 0.35 }} />
                                </div>
                                <div className="flex-1 space-y-1.5 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-foreground">{stage.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{stageTasks.length}</span>
                                  </div>
                                  {stageTasks.map(renderTaskCard)}
                                </div>
                              </div>
                            );
                          })}
                          {unstaged.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 px-1">
                                <span className="text-[11px] font-semibold text-muted-foreground">Sem etapa</span>
                                <span className="text-[10px] text-muted-foreground">{unstaged.length}</span>
                              </div>
                              {unstaged.map(renderTaskCard)}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {groupTasks.map(renderTaskCard)}
                      </div>
                    );
                  })()}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => openNewTask(group.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
                  </Button>
                </>
              )}
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

      {/* Stage Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={stageName} onChange={e => setStageName(e.target.value)} placeholder="Ex: Contato inicial" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={stageColor} onChange={e => setStageColor(e.target.value)} className="h-9 w-12 rounded border border-input cursor-pointer" />
                <Input value={stageColor} onChange={e => setStageColor(e.target.value)} className="w-28 font-mono text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveStage} disabled={saving || !stageName.trim()}>
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
              <Label>Etapa</Label>
              <Select value={taskStageId || "none"} onValueChange={v => setTaskStageId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sem etapa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem etapa</SelectItem>
                  {stages.filter(s => s.group_id === taskGroupId).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>
          <DialogFooter>
            <Button onClick={saveTask} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurrence Dialog */}
      <Dialog open={recurrenceDialogOpen} onOpenChange={setRecurrenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Recorrência</DialogTitle>
          </DialogHeader>
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
          <DialogFooter>
            <Button onClick={saveRecurrence} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule (recurring task) Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Editar tarefa recorrente" : "Nova tarefa recorrente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo da tarefa</Label>
              <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensagem">Mensagem</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="personalizada">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduleType === "personalizada" && (
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={scheduleDescription}
                  onChange={e => setScheduleDescription(e.target.value)}
                  placeholder="O que deve ser feito?"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Modo</Label>
              <Select value={scheduleMode} onValueChange={(v) => setScheduleMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific">Dias específicos</SelectItem>
                  <SelectItem value="until">Todos os dias até o dia X</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduleMode === "specific" ? (
              <div className="space-y-2">
                <Label>Dias após a entrada</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={scheduleDayInput}
                    onChange={e => setScheduleDayInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addScheduleDay(); } }}
                    placeholder="Ex: 1"
                    className="w-32"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addScheduleDay}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {scheduleDays.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhum dia adicionado.</span>
                  )}
                  {scheduleDays.map(d => (
                    <Badge key={d} variant="secondary" className="gap-1 pr-1">
                      Dia {d}
                      <button onClick={() => removeScheduleDay(d)} className="hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Criar tarefa todos os dias até o dia</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={scheduleUntil}
                  onChange={e => setScheduleUntil(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Serão geradas {scheduleUntil} tarefas (dia 1 ao {scheduleUntil}).
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveSchedule} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
