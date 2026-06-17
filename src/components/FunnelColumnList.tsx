import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown, ClipboardList, ArrowUpDown, Shield, AlertTriangle, Circle, Settings, ShieldCheck, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const COLOR_OPTIONS = [
  "#ef4444", "#dc2626", "#f97316", "#ea580c",
  "#f59e0b", "#d97706", "#eab308", "#84cc16",
  "#22c55e", "#16a34a", "#10b981", "#059669",
  "#06b6d4", "#0891b2", "#3b82f6", "#2563eb",
  "#6366f1", "#4f46e5", "#8b5cf6", "#7c3aed",
  "#ec4899", "#db2777", "#f43f5e", "#e11d48",
  "#64748b", "#475569", "#78716c", "#57534e",
];

interface FunnelColumn {
  id: string;
  funnel_id: string;
  name: string;
  color: string;
  position: number;
  allowed_actions?: string[];
}

const ACTION_OPTIONS = [
  { value: "sold", label: "Vendido" },
  { value: "lost", label: "Perdida" },
  { value: "disqualified", label: "Desqualificar" },
];

interface Props {
  funnelId: string;
  columns: FunnelColumn[];
  onChanged: () => void;
}

const REQUIREMENT_FIELDS = [
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "value", label: "Valor" },
  { value: "state", label: "Estado" },
  { value: "city", label: "Cidade" },
  { value: "acquisition_channel", label: "Canal de aquisição" },
  { value: "notes", label: "Notas" },
  { value: "return_date", label: "Data de retorno" },
  { value: "task", label: "Tarefa obrigatória" },
];

const BLOCKED_FIELDS = [
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "value", label: "Valor" },
  { value: "state", label: "Estado" },
  { value: "city", label: "Cidade" },
  { value: "acquisition_channel", label: "Canal de aquisição" },
  { value: "notes", label: "Notas" },
  { value: "return_date", label: "Data de retorno" },
  { value: "tags", label: "Tags" },
];

export function FunnelColumnList({ funnelId, columns, onChanged }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [taskGroups, setTaskGroups] = useState<{ id: string; name: string }[]>([]);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [requirementsColumnId, setRequirementsColumnId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Record<string, string[]>>({});
  const [blockedColumnId, setBlockedColumnId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Record<string, string[]>>({});
  const [columnDealCounts, setColumnDealCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const editingColumn = columns.find((c) => c.id === editingColumnId);
  const requirementsColumn = columns.find((c) => c.id === requirementsColumnId);
  const blockedColumn = columns.find((c) => c.id === blockedColumnId);

  const fetchTaskGroups = useCallback(async () => {
    const { data } = await supabase.from("task_groups").select("id, name").order("name");
    setTaskGroups(data || []);
  }, []);

  const fetchRequirements = useCallback(async () => {
    const colIds = columns.map((c) => c.id);
    if (colIds.length === 0) { setRequirements({}); return; }
    const { data } = await supabase
      .from("column_entry_requirements")
      .select("column_id, field_name")
      .in("column_id", colIds);
    const map: Record<string, string[]> = {};
    (data || []).forEach((r: any) => {
      if (!map[r.column_id]) map[r.column_id] = [];
      map[r.column_id].push(r.field_name);
    });
    setRequirements(map);
  }, [columns]);

  const fetchBlocked = useCallback(async () => {
    const colIds = columns.map((c) => c.id);
    if (colIds.length === 0) { setBlocked({}); return; }
    const { data } = await supabase
      .from("column_blocked_fields" as any)
      .select("column_id, field_name")
      .in("column_id", colIds);
    const map: Record<string, string[]> = {};
    (data || []).forEach((r: any) => {
      if (!map[r.column_id]) map[r.column_id] = [];
      map[r.column_id].push(r.field_name);
    });
    setBlocked(map);
  }, [columns]);

  const fetchColumnDealCounts = useCallback(async () => {
    const colNames = columns.map((c) => c.name);
    if (colNames.length === 0) { setColumnDealCounts({}); return; }
    const { data } = await supabase
      .from("deals")
      .select("status")
      .eq("funnel_id", funnelId)
      .eq("archived", false)
      .in("status", colNames);
    const counts: Record<string, number> = {};
    columns.forEach((c) => { counts[c.id] = 0; });
    (data || []).forEach((d: any) => {
      const col = columns.find((c) => c.name === d.status);
      if (col) counts[col.id] = (counts[col.id] || 0) + 1;
    });
    setColumnDealCounts(counts);
  }, [columns, funnelId]);

  useEffect(() => { fetchTaskGroups(); }, [fetchTaskGroups]);
  useEffect(() => { fetchRequirements(); }, [fetchRequirements]);
  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);
  useEffect(() => { fetchColumnDealCounts(); }, [fetchColumnDealCounts]);

  const handleToggleRequirement = async (colId: string, fieldName: string, checked: boolean) => {
    if (!authUser) return;
    const user = authUser;
    if (checked) {
      await supabase.from("column_entry_requirements").insert({ column_id: colId, field_name: fieldName, user_id: user.id } as any);
    } else {
      await supabase.from("column_entry_requirements").delete().eq("column_id", colId).eq("field_name", fieldName);
    }
    fetchRequirements();
  };

  const handleToggleBlocked = async (colId: string, fieldName: string, checked: boolean) => {
    if (!authUser) return;
    const user = authUser;
    if (checked) {
      const reqs = requirements[colId] || [];
      if (reqs.includes(fieldName)) {
        toast({
          title: "Conflito",
          description: "Este campo já é obrigatório nesta coluna. Remova o requisito antes de bloqueá-lo.",
          variant: "destructive",
        });
        return;
      }
      await supabase.from("column_blocked_fields" as any).insert({ column_id: colId, field_name: fieldName, user_id: user.id } as any);
    } else {
      await supabase.from("column_blocked_fields" as any).delete().eq("column_id", colId).eq("field_name", fieldName);
    }
    fetchBlocked();
  };

  const handleUpdateTaskGroup = async (colId: string, taskGroupId: string | null) => {
    await supabase.from("funnel_columns").update({ task_group_id: taskGroupId } as any).eq("id", colId);
    onChanged();
  };

  const handleUpdateSortOrder = async (colId: string, sortOrder: string) => {
    await supabase.from("funnel_columns").update({ sort_order: sortOrder } as any).eq("id", colId);
    onChanged();
  };

  const handleUpdateAllowedActions = async (colId: string, actions: string[]) => {
    await supabase.from("funnel_columns").update({ allowed_actions: actions } as any).eq("id", colId);
    onChanged();
  };

  const handleUpdateIsNotice = async (colId: string, isNotice: boolean) => {
    await supabase.from("funnel_columns").update({ is_notice: isNotice } as any).eq("id", colId);
    onChanged();
  };

  const handleUpdateNoticeText = async (colId: string, text: string) => {
    await supabase.from("funnel_columns").update({ notice_text: text } as any).eq("id", colId);
    onChanged();
  };

  const handleUpdateHasDailyColor = async (colId: string, hasDailyColor: boolean) => {
    await supabase.from("funnel_columns").update({ has_daily_color: hasDailyColor } as any).eq("id", colId);
    onChanged();
  };

  const handleUpdateDailyColors = async (colId: string, colors: string[]) => {
    await supabase.from("funnel_columns").update({ daily_colors: colors } as any).eq("id", colId);
    onChanged();
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    if (!authUser) return;
    const user = authUser;

    const { error } = await supabase.from("funnel_columns").insert({
      funnel_id: funnelId,
      name: newName.trim(),
      color: newColor,
      position: columns.length,
      user_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setNewName("");
      onChanged();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("funnel_columns").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      if (editingColumnId === id) setEditingColumnId(null);
      onChanged();
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const current = columns[index];
    const target = columns[targetIndex];

    await Promise.all([
      supabase.from("funnel_columns").update({ position: target.position }).eq("id", current.id),
      supabase.from("funnel_columns").update({ position: current.position }).eq("id", target.id),
    ]);
    onChanged();
  };

  const handleUpdateName = async (id: string, newName: string) => {
    const col = columns.find((c) => c.id === id);
    if (!col) return;
    const oldName = col.name;
    const { error } = await supabase.from("funnel_columns").update({ name: newName }).eq("id", id);
    if (!error && oldName !== newName) {
      await supabase.from("deals").update({ status: newName }).eq("status", oldName).eq("funnel_id", funnelId);
    }
    onChanged();
  };

  const handleUpdateColor = async (id: string, color: string) => {
    await supabase.from("funnel_columns").update({ color }).eq("id", id);
    onChanged();
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Colunas do Funil</h2>

      <div className="space-y-2">
        {columns.map((col, i) => (
          <div key={col.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
            <div className="flex flex-col gap-0.5">
              <Button size="icon" variant="ghost" className="h-5 w-5" disabled={i === 0} onClick={() => handleMove(i, -1)}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-5 w-5" disabled={i === columns.length - 1} onClick={() => handleMove(i, 1)}>
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>

            <div
              className="h-8 w-8 rounded-md flex-shrink-0 cursor-pointer relative group"
              style={{ backgroundColor: col.color }}
            >
              <div className="absolute top-full left-0 mt-1 hidden group-hover:flex gap-1 flex-wrap bg-popover border border-border rounded-lg p-2 z-50 w-52 shadow-lg">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onClick={() => handleUpdateColor(col.id, c)}
                  />
                ))}
              </div>
            </div>

            <Input
              className="flex-1"
              defaultValue={col.name}
              onBlur={(e) => {
                if (e.target.value !== col.name) handleUpdateName(col.id, e.target.value);
              }}
            />

            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRequirementsColumnId(col.id)} title="Requisitos de entrada">
              <ShieldCheck className="h-4 w-4" />
            </Button>

            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingColumnId(col.id)} title="Configurações">
              <Settings className="h-4 w-4" />
            </Button>

            {(columnDealCounts[col.id] || 0) === 0 && (
              <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDelete(col.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2">
        <div className="relative group">
          <div className="h-8 w-8 rounded-md flex-shrink-0 cursor-pointer" style={{ backgroundColor: newColor }} />
          <div className="absolute top-full left-0 mt-1 hidden group-hover:flex gap-1 flex-wrap bg-popover border border-border rounded-lg p-2 z-50 w-52 shadow-lg">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
        </div>
        <Input
          placeholder="Nome da nova coluna..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Sheet de configurações da coluna */}
      <Sheet open={!!editingColumnId} onOpenChange={(open) => { if (!open) setEditingColumnId(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurações — {editingColumn?.name}</SheetTitle>
          </SheetHeader>

          {editingColumn && (
            <div className="space-y-6 mt-6">
              {/* Coluna de aviso */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={(editingColumn as any).is_notice || false}
                    onCheckedChange={(v) => handleUpdateIsNotice(editingColumn.id, !!v)}
                  />
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Coluna de aviso</span>
                </label>

                {(editingColumn as any).is_notice && (
                  <Textarea
                    placeholder="Texto do aviso..."
                    defaultValue={(editingColumn as any).notice_text || ""}
                    key={editingColumn.id + "-notice"}
                    onBlur={(e) => {
                      if (e.target.value !== ((editingColumn as any).notice_text || "")) {
                        handleUpdateNoticeText(editingColumn.id, e.target.value);
                      }
                    }}
                  />
                )}
              </div>

              {!(editingColumn as any).is_notice && (
                <>
                  {/* Bolas coloridas */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={(editingColumn as any).has_daily_color !== false}
                      onCheckedChange={(v) => handleUpdateHasDailyColor(editingColumn.id, !!v)}
                    />
                    <Circle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Bolas coloridas</span>
                  </label>

                  {(editingColumn as any).has_daily_color !== false && (() => {
                    const current: string[] = (editingColumn as any).daily_colors ?? ["red", "yellow", "green"];
                    const opts: { key: string; label: string; hex: string }[] = [
                      { key: "red", label: "Vermelho", hex: "#ef4444" },
                      { key: "yellow", label: "Amarelo", hex: "#eab308" },
                      { key: "green", label: "Verde", hex: "#22c55e" },
                    ];
                    return (
                      <div className="ml-6 flex flex-wrap gap-3">
                        {opts.map((o) => {
                          const checked = current.includes(o.key);
                          const isLast = checked && current.length === 1;
                          return (
                            <label key={o.key} className={`flex items-center gap-1.5 ${isLast ? "opacity-60" : "cursor-pointer"}`}>
                              <Checkbox
                                checked={checked}
                                disabled={isLast}
                                onCheckedChange={(v) => {
                                  const next = v
                                    ? Array.from(new Set([...current, o.key]))
                                    : current.filter((c) => c !== o.key);
                                  // preserve canonical order
                                  const ordered = ["red", "yellow", "green"].filter((k) => next.includes(k));
                                  if (ordered.length === 0) return;
                                  handleUpdateDailyColors(editingColumn.id, ordered);
                                }}
                              />
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: o.hex }} />
                              <span className="text-xs">{o.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Grupo de tarefas */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4" /> Grupo de tarefas
                    </label>
                    <Select
                      value={(editingColumn as any).task_group_id || "none"}
                      onValueChange={(v) => handleUpdateTaskGroup(editingColumn.id, v === "none" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Grupo de tarefas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem grupo</SelectItem>
                        {taskGroups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ordenação */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <ArrowUpDown className="h-4 w-4" /> Ordenação
                    </label>
                    <Select
                      value={(editingColumn as any).sort_order || "channel"}
                      onValueChange={(v) => handleUpdateSortOrder(editingColumn.id, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ordenação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="channel">Canal de aquisição</SelectItem>
                        <SelectItem value="alphabetical">Ordem alfabética</SelectItem>
                        <SelectItem value="created_at">Data de criação</SelectItem>
                        <SelectItem value="next_task">Próxima tarefa</SelectItem>
                        <SelectItem value="return_date">Data de retorno</SelectItem>
                        <SelectItem value="value_desc">Maior valor</SelectItem>
                        <SelectItem value="value_asc">Menor valor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ações permitidas */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Shield className="h-4 w-4" /> Ações do vendedor
                    </label>
                    {ACTION_OPTIONS.map((action) => {
                      const currentActions = (editingColumn as any).allowed_actions || ["sold", "lost", "disqualified"];
                      const checked = currentActions.includes(action.value);
                      return (
                        <label key={action.value} className="flex items-center gap-2 py-1 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v
                                ? [...currentActions, action.value]
                                : currentActions.filter((a: string) => a !== action.value);
                              handleUpdateAllowedActions(editingColumn.id, next);
                            }}
                          />
                          <span className="text-sm">{action.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet de requisitos de entrada */}
      <Sheet open={!!requirementsColumnId} onOpenChange={(open) => { if (!open) setRequirementsColumnId(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Requisitos de entrada — {requirementsColumn?.name}</SheetTitle>
          </SheetHeader>

          {requirementsColumn && (
            <div className="space-y-4 mt-6">
              <p className="text-sm text-muted-foreground">
                Selecione os campos que devem estar preenchidos para um card entrar nesta etapa.
              </p>

              {REQUIREMENT_FIELDS.map((field) => {
                const colReqs = requirements[requirementsColumn.id] || [];
                const checked = colReqs.includes(field.value);
                return (
                  <label key={field.value} className="flex items-center gap-2 py-1 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => handleToggleRequirement(requirementsColumn.id, field.value, !!v)}
                    />
                    <span className="text-sm font-medium">{field.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
