import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown, ClipboardList, ArrowUpDown, Shield, AlertTriangle, Circle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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

export function FunnelColumnList({ funnelId, columns, onChanged }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [taskGroups, setTaskGroups] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const fetchTaskGroups = useCallback(async () => {
    const { data } = await supabase.from("task_groups").select("id, name").order("name");
    setTaskGroups(data || []);
  }, []);

  useEffect(() => { fetchTaskGroups(); }, [fetchTaskGroups]);

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

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

            <label className="flex items-center gap-1.5 cursor-pointer shrink-0" title="Coluna de aviso">
              <Checkbox
                checked={(col as any).is_notice || false}
                onCheckedChange={(v) => handleUpdateIsNotice(col.id, !!v)}
              />
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            </label>

            {!(col as any).is_notice && (
200:               <label className="flex items-center gap-1.5 cursor-pointer shrink-0" title="Bolas coloridas">
                <Checkbox
                  checked={(col as any).has_daily_color !== false}
                  onCheckedChange={(v) => handleUpdateHasDailyColor(col.id, !!v)}
                />
                <Circle className="h-3.5 w-3.5 text-green-500" />
              </label>
            )}

            {(col as any).is_notice ? (
              <Textarea
                className="flex-1 min-h-[32px] h-8 text-xs resize-none"
                placeholder="Texto do aviso..."
                defaultValue={(col as any).notice_text || ""}
                onBlur={(e) => {
                  if (e.target.value !== ((col as any).notice_text || "")) {
                    handleUpdateNoticeText(col.id, e.target.value);
                  }
                }}
              />
            ) : (
              <>
                <Select
                  value={(col as any).task_group_id || "none"}
                  onValueChange={(v) => handleUpdateTaskGroup(col.id, v === "none" ? null : v)}
                >
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <ClipboardList className="h-3 w-3 mr-1 shrink-0" />
                    <SelectValue placeholder="Grupo de tarefas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem grupo</SelectItem>
                    {taskGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={(col as any).sort_order || "channel"}
                  onValueChange={(v) => handleUpdateSortOrder(col.id, v)}
                >
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <ArrowUpDown className="h-3 w-3 mr-1 shrink-0" />
                    <SelectValue placeholder="Ordenação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="channel">Canal de aquisição</SelectItem>
                    <SelectItem value="alphabetical">Ordem alfabética</SelectItem>
                    <SelectItem value="created_at">Data de criação</SelectItem>
                    <SelectItem value="next_task">Próxima tarefa</SelectItem>
                    <SelectItem value="value_desc">Maior valor</SelectItem>
                    <SelectItem value="value_asc">Menor valor</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Ações permitidas">
                      <Shield className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-3" align="end">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">Ações do vendedor</p>
                    {ACTION_OPTIONS.map((action) => {
                      const currentActions = (col as any).allowed_actions || ["sold", "lost", "disqualified"];
                      const checked = currentActions.includes(action.value);
                      return (
                        <label key={action.value} className="flex items-center gap-2 py-1 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v
                                ? [...currentActions, action.value]
                                : currentActions.filter((a: string) => a !== action.value);
                              handleUpdateAllowedActions(col.id, next);
                            }}
                          />
                          <span className="text-sm">{action.label}</span>
                        </label>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </>
            )}
            <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDelete(col.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
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
    </div>
  );
}
