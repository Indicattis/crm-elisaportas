import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlanningClient } from "@/pages/SalesPlanning";
import { cn } from "@/lib/utils";

interface PlanningClientCardProps {
  client: PlanningClient;
  onComplete: (id: string) => void | Promise<void>;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const TEMP_META = {
  hot: {
    label: "Quente",
    dot: "#ef4444",
    bg: "rgba(239, 68, 68, 0.08)",
    text: "text-red-500",
  },
  warm: {
    label: "Morno",
    dot: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.08)",
    text: "text-amber-500",
  },
} as const;

export function PlanningClientCard({ client, onComplete }: PlanningClientCardProps) {
  const [completing, setCompleting] = useState(false);
  const meta = TEMP_META[client.temperature];

  const handleCheck = async (v: boolean | "indeterminate") => {
    if (!v) return;
    setCompleting(true);
    // Small delay so the checkmark animation is visible
    setTimeout(() => onComplete(client.id), 180);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3 shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.12)] hover:shadow-[0_6px_18px_-6px_hsl(var(--foreground)/0.2)] hover:-translate-y-0.5 transition-all",
        completing && "opacity-0 scale-95 pointer-events-none",
      )}
      style={{ transitionDuration: completing ? "180ms" : undefined }}
    >
      {/* Temperature dot */}
      <div
        className="h-2.5 w-2.5 rounded-full shrink-0 shadow-inner"
        style={{
          backgroundColor: meta.dot,
          boxShadow: `0 0 0 3px ${meta.bg}`,
        }}
        aria-label={meta.label}
      />

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{client.name}</div>
        <div className="flex items-center gap-2 text-[11px] mt-0.5">
          <span className={cn("font-semibold", meta.text)}>{meta.label}</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-success font-semibold tabular-nums">
            {fmtBRL(client.value)}
          </span>
        </div>
      </div>

      <Checkbox
        checked={completing}
        onCheckedChange={handleCheck}
        aria-label="Marcar como concluído"
        className="shrink-0"
      />
    </div>
  );
}
