import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { User, DollarSign, Calendar, Clock, Flame, Tag, UserPlus, Bell, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

interface DealTag {
  id: string;
  name: string;
  color: string;
}

interface AssignedProfile {
  full_name: string | null;
  avatar_url: string | null;
}

interface DealCardProps {
  deal: Tables<"deals"> & { assigned_to?: string | null };
  tags?: DealTag[];
  allTags?: DealTag[];
  assignedProfile?: AssignedProfile | null;
  hasOverdueTasks?: boolean;
  dailyColor?: string;
  onTagsChanged?: (dealId: string, tagId: string, checked: boolean) => void;
  onCapture?: (dealId: string) => void;
  onColorChange?: (dealId: string, newColor: string) => void;
  onClick: () => void;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

const COLOR_CYCLE: Record<string, string> = { red: "yellow", yellow: "green", green: "red" };
const COLOR_HEX: Record<string, string> = { red: "#ef4444", yellow: "#eab308", green: "#22c55e" };

export function DealCard({ deal, tags = [], allTags = [], assignedProfile, hasOverdueTasks, dailyColor, onTagsChanged, onCapture, onColorChange, onClick }: DealCardProps) {
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
      data-deal-card
      className="group cursor-pointer rounded-lg px-2.5 py-2 space-y-1 hover:shadow-md transition-shadow border border-border/40 bg-background select-none touch-none [&_*]:select-none [&_img]:pointer-events-none"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            className="shrink-0 h-3 w-3 rounded-full transition-all"
            style={{
              backgroundColor: COLOR_HEX[dailyColor || "red"],
              boxShadow: `0 0 8px ${COLOR_HEX[dailyColor || "red"]}`,
            }}
            title="Alterar status diário"
            onClick={(e) => {
              e.stopPropagation();
              const next = COLOR_CYCLE[dailyColor || "red"];
              onColorChange?.(deal.id, next);
            }}
          />
          {hasOverdueTasks && (
            <Bell className="h-3.5 w-3.5 text-red-500 fill-red-500 shrink-0" />
          )}
          <h4 className="text-sm font-semibold text-foreground leading-tight flex-1 min-w-0">
            
            {deal.title}
          </h4>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {allTags.length > 0 && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="p-1 rounded-md hover:bg-background/60 transition-colors opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  <Tag className="h-4 w-4 text-muted-foreground" />
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
          {(deal as any).assigned_to && assignedProfile ? (
            <Avatar className="h-7 w-7" title={assignedProfile.full_name || "Responsável"}>
              {assignedProfile.avatar_url ? (
                <AvatarImage src={assignedProfile.avatar_url} alt={assignedProfile.full_name || ""} />
              ) : null}
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {(assignedProfile.full_name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <button
              className="h-7 w-7 rounded-full flex items-center justify-center border border-dashed border-muted-foreground/40 hover:bg-accent hover:border-primary transition-colors"
              title="Capturar negociação"
              onClick={(e) => { e.stopPropagation(); onCapture?.(deal.id); }}
            >
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          {(deal as any).phone && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{(deal as any).phone}</span>
            </span>
          )}
          {deal.heat > 0 && (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: deal.heat }, (_, i) => (
                <Flame key={i} className="h-3 w-3 text-orange-500 fill-orange-500" />
              ))}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 ${daysInStage <= 3 ? "text-green-600" : daysInStage <= 7 ? "text-yellow-600" : "text-destructive font-medium"}`}>
          <Clock className="h-3 w-3" />
          <span>{daysInStage === 0 ? format(new Date(deal.updated_at), "HH:mm") : `${daysInStage}d`}</span>
        </div>
      </div>
      {(deal.city || deal.state) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{[deal.city, deal.state].filter(Boolean).join(" - ")}</span>
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} className="text-[10px] px-1.5 py-0 leading-4" style={{ backgroundColor: tag.color, color: "#fff" }}>
              {tag.name}
            </Badge>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(deal.created_at), "dd/MM/yy")}
        </span>
        {deal.value && deal.value > 0 && (
          <span className="bg-primary/10 text-primary font-bold text-xs rounded px-1.5 py-0.5 flex items-center gap-0.5">
            <DollarSign className="h-3 w-3" />
            R$ {Number(deal.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>
    </div>
  );
}
