import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlanningClient } from "@/pages/SalesPlanning";
import { cn } from "@/lib/utils";
import { Flame, Thermometer } from "lucide-react";

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
    bg: "rgba(239, 68, 68, 0.10)",
    text: "text-red-500",
    ring: "ring-red-500/20",
    accent: "from-red-500/15 via-red-500/5 to-transparent",
    bar: "bg-red-500",
    Icon: Flame,
  },
  warm: {
    label: "Morno",
    dot: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.10)",
    text: "text-amber-500",
    ring: "ring-amber-500/20",
    accent: "from-amber-500/15 via-amber-500/5 to-transparent",
    bar: "bg-amber-500",
    Icon: Thermometer,
  },
} as const;

export function PlanningClientCard({ client, onComplete }: PlanningClientCardProps) {
  const [completing, setCompleting] = useState(false);
  const meta = TEMP_META[client.temperature];
  const Icon = meta.Icon;

  const handleCheck = async (v: boolean | "indeterminate") => {
    if (!v) return;
    setCompleting(true);
    setTimeout(() => onComplete(client.id), 180);
  };

  return (
    <div
      className={cn(
        "group relative flex items-stretch gap-0 rounded-2xl border border-border/60 bg-card/90 overflow-hidden shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)] hover:shadow-[0_10px_28px_-10px_hsl(var(--foreground)/0.25)] hover:-translate-y-0.5 hover:border-border transition-all",
        completing && "opacity-0 scale-95 pointer-events-none",
      )}
      style={{ transitionDuration: completing ? "180ms" : undefined }}
    >
      {/* Left color bar */}
      <div className={cn("w-1.5 shrink-0", meta.bar)} />

      <div className={cn("flex-1 flex items-center gap-3 p-4 bg-gradient-to-r", meta.accent)}>
        {/* Icon badge */}
        <div
          className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ring-1", meta.ring)}
          style={{ backgroundColor: meta.bg }}
        >
          <Icon className={cn("h-5 w-5", meta.text)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold truncate leading-tight">{client.name}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1",
                meta.text,
                meta.ring,
              )}
              style={{ backgroundColor: meta.bg }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
              {meta.label}
            </span>
            <span className="text-sm font-bold text-success tabular-nums">
              {fmtBRL(client.value)}
            </span>
          </div>
        </div>

        <Checkbox
          checked={completing}
          onCheckedChange={handleCheck}
          aria-label="Marcar como concluído"
          className="shrink-0 h-5 w-5"
        />
      </div>
    </div>
  );
}
