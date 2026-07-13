import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanningClientCard } from "./PlanningClientCard";
import { AddPlanningClientDialog } from "./AddPlanningClientDialog";
import type { PlanningClient, Temperature } from "@/pages/SalesPlanning";

interface PlanningColumnProps {
  seller: { id: string; name: string };
  clients: PlanningClient[];
  onAdd: (payload: { name: string; value: number; temperature: Temperature }) => void | Promise<void>;
  onComplete: (id: string) => void | Promise<void>;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function PlanningColumn({ seller, clients, onAdd, onComplete }: PlanningColumnProps) {
  const [openAdd, setOpenAdd] = useState(false);

  const sorted = useMemo(() => {
    const order: Record<Temperature, number> = { hot: 0, warm: 1 };
    return [...clients].sort((a, b) => {
      const t = order[a.temperature] - order[b.temperature];
      if (t !== 0) return t;
      if (b.value !== a.value) return b.value - a.value;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [clients]);

  const total = clients.reduce((acc, c) => acc + (c.value || 0), 0);

  return (
    <div className="glass rounded-3xl w-[380px] shrink-0 flex flex-col max-h-[calc(100vh-180px)] border border-border/60 shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.18)] overflow-hidden">
      <div className="relative p-5 border-b border-border/50 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-primary/20">
                {seller.name.trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-base truncate leading-tight">{seller.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-background/50 border border-border/40 px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total</span>
              <span className="ml-auto text-sm font-bold text-success tabular-nums">{fmtBRL(total)}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 shrink-0 rounded-xl bg-background/60 hover:bg-primary hover:text-primary-foreground border border-border/50 transition-colors"
            onClick={() => setOpenAdd(true)}
            aria-label="Adicionar cliente"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-background/30">

        {sorted.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-border/50 rounded-xl">
            Nenhum cliente ainda
          </div>
        ) : (
          sorted.map((c) => (
            <PlanningClientCard key={c.id} client={c} onComplete={onComplete} />
          ))
        )}
      </div>

      <AddPlanningClientDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        sellerName={seller.name}
        onSubmit={async (payload) => {
          await onAdd(payload);
          setOpenAdd(false);
        }}
      />
    </div>
  );
}
