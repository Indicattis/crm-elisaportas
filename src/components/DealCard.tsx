import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, User, DollarSign } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface DealCardProps {
  deal: Tables<"deals"> & { clients?: Tables<"clients"> | null };
  onClick: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass group cursor-pointer rounded-xl p-3 space-y-2 hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-semibold text-foreground leading-tight">{deal.title}</h4>
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-muted-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      {deal.clients && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{deal.clients.name}</span>
        </div>
      )}
      {deal.value && deal.value > 0 && (
        <div className="flex items-center gap-1 text-xs font-medium text-primary">
          <DollarSign className="h-3 w-3" />
          <span>R$ {Number(deal.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
      )}
    </div>
  );
}
