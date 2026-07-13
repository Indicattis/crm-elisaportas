import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Flame, Thermometer, Building2, Sigma, Loader2 } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

interface PlanningFooterProps {
  hot: number;
  warm: number;
  current: number;
  onCurrentChange: (v: number) => void;
  rowId: string | null;
  onRowIdChange: (id: string) => void;
}

export function PlanningFooter({
  hot,
  warm,
  current,
  onCurrentChange,
  rowId,
  onRowIdChange,
}: PlanningFooterProps) {
  const { role } = useUserRole();
  const { user } = useAuth();
  const isAdmin = role === "admin";
  const [editing, setEditing] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = hot + warm + current;

  const save = async () => {
    const parsed = Number(editing.replace(/\./g, "").replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Valor inválido");
      setIsEditing(false);
      return;
    }
    setSaving(true);
    const prev = current;
    onCurrentChange(parsed);
    setIsEditing(false);

    let error;
    if (rowId) {
      ({ error } = await supabase
        .from("company_revenue")
        .update({ value: parsed, updated_by: user?.id })
        .eq("id", rowId));
    } else {
      const { data, error: insErr } = await supabase
        .from("company_revenue")
        .insert({ singleton: true, value: parsed, updated_by: user?.id })
        .select("id")
        .single();
      error = insErr;
      if (data) onRowIdChange(data.id);
    }
    setSaving(false);
    if (error) {
      onCurrentChange(prev);
      toast.error("Erro ao salvar", { description: error.message });
    } else {
      toast.success("Faturamento atualizado");
    }
  };

  const rows = [
    {
      key: "hot",
      icon: <Flame className="h-4 w-4 text-red-500" />,
      label: "Projetado — Quente",
      value: fmtBRL(hot),
      accent: "bg-red-500/5",
      dot: "bg-red-500",
    },
    {
      key: "warm",
      icon: <Thermometer className="h-4 w-4 text-amber-500" />,
      label: "Projetado — Morno",
      value: fmtBRL(warm),
      accent: "bg-amber-500/5",
      dot: "bg-amber-500",
    },
  ];

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Resumo financeiro
        </h2>
      </div>
      <div className="divide-y divide-border/50">
        {rows.map((r) => (
          <div
            key={r.key}
            className={`flex items-center justify-between gap-4 px-4 py-3 ${r.accent}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`h-2 w-2 rounded-full ${r.dot}`} />
              {r.icon}
              <span className="text-sm font-medium truncate">{r.label}</span>
            </div>
            <span className="text-base font-semibold tabular-nums">{r.value}</span>
          </div>
        ))}

        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-primary/5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium truncate">Faturamento atual</span>
          </div>
          {isAdmin && isEditing ? (
            <Input
              autoFocus
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="h-8 w-40 text-sm font-semibold text-right"
              placeholder="0,00"
            />
          ) : (
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => {
                setEditing(String(current).replace(".", ","));
                setIsEditing(true);
              }}
              className={`text-base font-semibold tabular-nums ${
                isAdmin ? "hover:text-primary transition-colors cursor-pointer" : "cursor-default"
              }`}
              title={isAdmin ? "Clique para editar" : ""}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : fmtBRL(current)}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-emerald-500/10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <Sigma className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold truncate">Total</span>
          </div>
          <span className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {fmtBRL(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
