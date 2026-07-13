import { useState, memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { User, DollarSign, Calendar, Clock, Flame, Tag, UserPlus, MapPin, CalendarClock } from "lucide-react";
import { getChannelIcon } from "@/lib/channel-icons";
import { applyPhoneMask } from "@/lib/phone-mask";
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
  allowedDailyColors?: string[];
  nextTaskDeadline?: string;
  channelIconKey?: string;
  currentStage?: { name: string; color: string; isRecurring?: boolean };
  onTagsChanged?: (dealId: string, tagId: string, checked: boolean) => void;
  onCapture?: (dealId: string) => void;
  onColorChange?: (dealId: string, newColor: string) => void;
  taskProgress?: { completed: number; total: number } | null;
  onClick: () => void;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

const COLOR_HEX: Record<string, string> = { red: "#ef4444", yellow: "#eab308", green: "#22c55e" };
const COLOR_ORDER = ["red", "yellow", "green"] as const;

export const DealCard = memo(function DealCard({ deal, tags = [], allTags = [], assignedProfile, hasOverdueTasks, dailyColor, allowedDailyColors, nextTaskDeadline, channelIconKey, currentStage, taskProgress, onTagsChanged, onCapture, onColorChange, onClick }: DealCardProps) {
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

  const msInStage = Date.now() - new Date(deal.updated_at).getTime();
  const daysInStage = Math.floor(msInStage / (1000 * 60 * 60 * 24));
  const hoursInStage = Math.floor(msInStage / (1000 * 60 * 60));

  const tagIds = new Set(tags.map((t) => t.id));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-deal-card
      className="group cursor-pointer rounded-xl px-3 py-2.5 space-y-1.5 hover:shadow-sm transition-shadow border border-border/40 bg-background select-none touch-none [&_*]:select-none [&_img]:pointer-events-none"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {/* Row 1: Status indicators + Title + Avatar */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {dailyColor !== undefined && (() => {
            const allowed = (allowedDailyColors && allowedDailyColors.length > 0)
              ? COLOR_ORDER.filter((c) => allowedDailyColors.includes(c))
              : [...COLOR_ORDER];
            const current = (dailyColor || "red") as typeof COLOR_ORDER[number];
            // Preserve green/yellow across column moves even if destination column restricts them
            const effective = allowed.includes(current) || current === "green" || current === "yellow"
              ? current
              : allowed[0];
            return (
              <span
                className="shrink-0 h-3 w-3 rounded-full transition-all"
                style={{
                  backgroundColor: COLOR_HEX[effective],
                  boxShadow: `0 0 8px ${COLOR_HEX[effective]}`,
                }}
              />
            );
          })()}
          {channelIconKey && (() => {
            const ChannelIcon = getChannelIcon(channelIconKey).icon;
            return <ChannelIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
          })()}
          <h4 className="text-sm font-semibold text-foreground leading-tight flex-1 min-w-0 truncate">
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
            <Avatar className="h-6 w-6" title={assignedProfile.full_name || "Responsável"}>
              {assignedProfile.avatar_url ? (
                <AvatarImage src={assignedProfile.avatar_url} alt={assignedProfile.full_name || ""} />
              ) : null}
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                {(assignedProfile.full_name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <button
              className="h-6 w-6 rounded-full flex items-center justify-center border border-dashed border-muted-foreground/40 hover:bg-accent hover:border-primary transition-colors"
              title="Capturar negociação"
              onClick={(e) => { e.stopPropagation(); onCapture?.(deal.id); }}
            >
              <UserPlus className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Phone + Heat + Time in stage */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          {(deal as any).phone && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{applyPhoneMask((deal as any).phone)}</span>
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
        <div className={`flex items-center gap-1 text-xs ${daysInStage <= 3 ? "text-green-600" : daysInStage <= 7 ? "text-yellow-600" : "text-destructive font-medium"}`}>
          <Clock className="h-3 w-3" />
          <span>{daysInStage === 0 ? `${hoursInStage}h` : `${daysInStage}d`}</span>
        </div>
      </div>

      {/* Row 3: Location */}
      {(deal.city || deal.state) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{[deal.city, deal.state].filter(Boolean).join(" - ")}</span>
        </div>
      )}

      {/* Row 4: Stage index + Next task */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          {(currentStage || (taskProgress && taskProgress.total > 0)) && (
            (() => {
              const allDone = taskProgress && taskProgress.total > 0 && taskProgress.completed === taskProgress.total;
              const showProgress = !currentStage?.isRecurring && taskProgress && taskProgress.total > 0;
              return (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 gap-1 font-medium border ${allDone ? "text-green-600 border-green-600" : "text-foreground border-foreground/40"}`}
                >
                  {currentStage && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: allDone ? "#22c55e" : currentStage.color }} />}
                  <span>{currentStage?.name ?? "Etapas"}</span>
                  {showProgress && (
                    <>
                      <span className="opacity-50">·</span>
                      <span>{taskProgress.completed}/{taskProgress.total}</span>
                    </>
                  )}
                </Badge>
              );
            })()
          )}
        </div>
        {(() => {
          const returnDate = (deal as any).return_date as string | null | undefined;
          if (returnDate) {
            const isPast = new Date(returnDate) < new Date();
            return (
              <div className={`flex items-center gap-1 shrink-0 font-medium ${isPast ? "text-destructive" : "text-primary"}`} title="Data para retorno">
                <CalendarClock className="h-3 w-3" />
                <span>{format(new Date(returnDate), "dd/MM HH:mm")}</span>
              </div>
            );
          }
          if (nextTaskDeadline) {
            return (
              <div className={`flex items-center gap-1 shrink-0 font-medium ${new Date(nextTaskDeadline) < new Date() ? "text-destructive" : "text-muted-foreground"}`}>
                <Clock className="h-3 w-3" />
                <span>{format(new Date(nextTaskDeadline), "dd/MM HH:mm")}</span>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Row 4: Value */}
      {(deal.value ?? 0) > 0 && (
        <div className="flex items-center justify-end text-[11px]">
          <span className="bg-primary/10 text-primary font-bold text-xs rounded px-2 py-0.5 flex items-center gap-0.5">
            <DollarSign className="h-3 w-3" />
            R$ {Number(deal.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
});
