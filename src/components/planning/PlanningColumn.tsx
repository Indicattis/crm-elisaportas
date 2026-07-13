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
    <div className="glass rounded-2xl w-[300px] shrink-0 flex flex-col max-h-[calc(100vh-180px)]">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{seller.name}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span>{clients.length} {clients.length === 1 ? "cliente" : "clientes"}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-success font-medium">{fmtBRL(total)}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => setOpenAdd(true)}
            aria-label="Adicionar cliente"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
