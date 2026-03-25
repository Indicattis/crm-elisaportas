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

function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function KanbanColumn({ status, color, deals, dealTagsMap = {}, allTags = [], onTagsChanged, onAddDeal, onEditDeal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const headerBg = color ? darkenHex(color, 0.25) : undefined;

  return (
    <div
      className="flex w-80 flex-shrink-0 flex-col rounded-2xl overflow-hidden transition-colors"
      style={{
        backgroundColor: color || (isOver ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--muted) / 0.3)'),
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{ backgroundColor: headerBg }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">{status}</h3>
            <span
              className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              {deals.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => onAddDeal(status)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-base font-bold text-white">
          {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 p-3 min-h-[100px]">
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
