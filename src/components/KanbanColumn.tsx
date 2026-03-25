import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealCard } from "./DealCard";
import type { Tables } from "@/integrations/supabase/types";

type DealWithClient = Tables<"deals"> & { clients?: Tables<"clients"> | null };

interface DealTag {
  id: string;
  name: string;
  color: string;
}

interface KanbanColumnProps {
  status: string;
  color?: string;
  deals: DealWithClient[];
  dealTagsMap?: Record<string, DealTag[]>;
  allTags?: DealTag[];
  onTagsChanged?: (dealId: string, tagId: string, checked: boolean) => void;
  onAddDeal: (status: string) => void;
  onEditDeal: (deal: DealWithClient) => void;
}

export function KanbanColumn({ status, color, deals, dealTagsMap = {}, allTags = [], onTagsChanged, onAddDeal, onEditDeal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const rgb = color ? hexToRgb(color) : null;

  return (
    <div
      className="flex w-72 flex-shrink-0 flex-col rounded-2xl p-3 transition-colors border-t-[3px]"
      style={{
        borderTopColor: color || 'transparent',
        backgroundColor: rgb
          ? `rgba(${rgb}, ${isOver ? 0.35 : 0.25})`
          : isOver ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--muted) / 0.3)',
      }}
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
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: rgb ? `rgba(${rgb}, 0.15)` : 'hsl(var(--primary) / 0.1)',
                    color: color || 'hsl(var(--primary))',
                  }}
                >
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
            <DealCard
              key={deal.id}
              deal={deal}
              tags={dealTagsMap[deal.id]}
              allTags={allTags}
              onTagsChanged={onTagsChanged}
              onClick={() => onEditDeal(deal)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
