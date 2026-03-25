import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealCard } from "./DealCard";
import type { Tables } from "@/integrations/supabase/types";

type DealWithClient = Tables<"deals"> & { clients?: Tables<"clients"> | null };

interface KanbanColumnProps {
  status: string;
  color?: string;
  deals: DealWithClient[];
  onAddDeal: (status: string) => void;
  onEditDeal: (deal: DealWithClient) => void;
}

export function KanbanColumn({ status, color, deals, onAddDeal, onEditDeal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex w-72 flex-shrink-0 flex-col rounded-2xl p-3 transition-colors ${
        isOver ? "bg-accent/50" : "bg-muted/30"
      }`}
    >
      {(() => {
        const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
        return (
          <div className="mb-3 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {color && (
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                )}
                <h3 className="text-sm font-semibold text-foreground">{status}</h3>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                  {deals.length}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddDeal(status)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {totalValue > 0 && (
              <p className="mt-1 text-xs text-muted-foreground pl-5">
                {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
          </div>
        );
      })()}

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 min-h-[100px]">
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => onEditDeal(deal)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
