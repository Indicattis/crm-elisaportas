import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { User, DollarSign, Calendar, Clock, Flame, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

interface DealTag {
  id: string;
  name: string;
  color: string;
}

interface DealCardProps {
  deal: Tables<"deals"> & { clients?: Tables<"clients"> | null };
  tags?: DealTag[];
  allTags?: DealTag[];
  onTagsChanged?: (dealId: string, tagId: string, checked: boolean) => void;
  onClick: () => void;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function DealCard({ deal, tags = [], allTags = [], onTagsChanged, onClick }: DealCardProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });

  const primaryTag = tags.length > 0 ? tags[0] : null;
  const primaryRgb = primaryTag ? hexToRgb(primaryTag.color) : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeftColor: primaryTag ? primaryTag.color : 'transparent',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid' as const,
  };

  const daysInStage = Math.floor(
    (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const tagIds = new Set(tags.map((t) => t.id));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group cursor-pointer rounded-xl p-3 space-y-2 hover:shadow-md transition-shadow border border-border/40 ${primaryTag ? 'text-white' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-semibold text-foreground leading-tight flex-1">{deal.title}</h4>
        {allTags.length > 0 && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="ml-1 p-1 rounded-md hover:bg-background/60 transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-48 p-2"
              align="end"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allTags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={tagIds.has(tag.id)}
                      onCheckedChange={(checked) => {
                        onTagsChanged?.(deal.id, tag.id, !!checked);
                      }}
                    />
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="truncate">{tag.name}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {deal.clients && (
        <div className={`flex items-center gap-1 text-xs ${primaryTag ? 'text-white/80' : 'text-muted-foreground'}`}>
          <User className="h-3 w-3" />
          <span>{deal.clients.name}</span>
        </div>
      )}
      {deal.value && deal.value > 0 && (
        <div className={`flex items-center gap-1 text-xs font-medium ${primaryTag ? 'text-white' : 'text-primary'}`}>
          <DollarSign className="h-3 w-3" />
          <span>R$ {Number(deal.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} className="text-[10px] px-1.5 py-0" style={{ backgroundColor: tag.color, color: "#fff" }}>
              {tag.name}
            </Badge>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
          )}
        </div>
      )}
      <div className={`flex items-center justify-between text-xs ${primaryTag ? 'text-white/70' : 'text-muted-foreground'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(deal.created_at), "dd/MM/yyyy")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className={daysInStage > 7 ? "text-destructive font-medium" : ""}>
              {daysInStage === 0 ? "Hoje" : `${daysInStage}d na etapa`}
            </span>
          </div>
        </div>
        {deal.heat > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: deal.heat }, (_, i) => (
              <Flame key={i} className="h-3 w-3 text-orange-500 fill-orange-500" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
