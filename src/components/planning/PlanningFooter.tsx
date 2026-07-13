import { useEffect, useState } from "react";
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
}

export function PlanningFooter({ hot, warm }: PlanningFooterProps) {
  const { role } = useUserRole();
  const { user } = useAuth();
  const isAdmin = role === "admin";
  const [current, setCurrent] = useState<number>(0);
  const [editing, setEditing] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_revenue")
        .select("id, value")
        .eq("singleton", true)
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        setCurrent(Number(data.value) || 0);
      }
    })();
  }, []);

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
    setCurrent(parsed);
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
      if (data) setRowId(data.id);
    }
    setSaving(false);
    if (error) {
      setCurrent(prev);
      toast.error("Erro ao salvar", { description: error.message });
    } else {
      toast.success("Faturamento atualizado");
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50 backdrop-blur-xl">
      <div className="px-4 md:px-8 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricBlock
            icon={<Flame className="h-4 w-4 text-red-500" />}
            label="Projetado — Quente"
            value={fmtBRL(hot)}
            accent="from-red-500/10 to-transparent"
            dot="bg-red-500"
          />
          <MetricBlock
            icon={<Thermometer className="h-4 w-4 text-amber-500" />}
            label="Projetado — Morno"
            value={fmtBRL(warm)}
            accent="from-amber-500/10 to-transparent"
            dot="bg-amber-500"
          />
          <div className="rounded-xl border border-border/50 bg-gradient-to-r from-primary/10 to-transparent px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wide">
              <Building2 className="h-4 w-4 text-primary" />
              Faturamento atual
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
                className="h-7 mt-1 text-sm font-semibold"
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
                className={`mt-0.5 text-lg font-bold text-foreground text-left w-full ${isAdmin ? "hover:text-primary transition-colors cursor-pointer" : "cursor-default"}`}
                title={isAdmin ? "Clique para editar" : ""}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : fmtBRL(current)}
              </button>
            )}
          </div>
          <MetricBlock
            icon={<Sigma className="h-4 w-4 text-emerald-500" />}
            label="Total"
            value={fmtBRL(total)}
            accent="from-emerald-500/10 to-transparent"
            dot="bg-emerald-500"
            emphasize
          />
        </div>
      </div>
    </div>
  );
}

function MetricBlock({
  icon,
  label,
  value,
  accent,
  emphasize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  dot?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border/50 bg-gradient-to-r ${accent} px-3 py-2`}>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 font-bold text-foreground ${emphasize ? "text-xl" : "text-lg"}`}>
        {value}
      </div>
    </div>
  );
}
