import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DealCard } from "./DealCard";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

interface DealTag {
  id: string;
  name: string;
  color: string;
}

interface AssignedProfile {
  full_name: string | null;
  avatar_url: string | null;
}

interface KanbanColumnProps {
  status: string;
  color?: string;
  deals: Deal[];
  dealTagsMap?: Record<string, DealTag[]>;
  allTags?: DealTag[];
  profilesMap?: Record<string, AssignedProfile>;
  overdueDeals?: Set<string>;
  dailyColorsMap?: Record<string, string>;
  nextTaskMap?: Record<string, string>;
  channelIconMap?: Record<string, string>;
  dealStageMap?: Record<string, { name: string; color: string }>;
  showDropSpacer?: boolean;
  isNotice?: boolean;
  noticeText?: string;
  hasDailyColor?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onTagsChanged?: (dealId: string, tagId: string, checked: boolean) => void;
  onCapture?: (dealId: string) => void;
  onColorChange?: (dealId: string, newColor: string) => void;
  onAddDeal: (status: string) => void;
  onEditDeal: (deal: Deal) => void;
}

function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function KanbanColumn({
  status,
  color,
  deals,
  dealTagsMap = {},
  allTags = [],
  profilesMap = {},
  overdueDeals = new Set(),
  dailyColorsMap = {},
  nextTaskMap = {},
  channelIconMap = {},
  dealStageMap = {},
  showDropSpacer = false,
  isNotice = false,
  noticeText = "",
  hasDailyColor = true,
  collapsed = false,
  onToggleCollapse,
  onTagsChanged,
  onCapture,
  onColorChange,
  onAddDeal,
  onEditDeal,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  if (isNotice) {
    const noticeBg = color
      ? isDark ? hexToRgba(color, 0.25) : color
      : "hsl(var(--muted) / 0.3)";
    return (
      <div
        className="flex w-14 flex-shrink-0 flex-col rounded-2xl overflow-hidden h-full"
        style={{ backgroundColor: noticeBg }}
      >
        <div
          className="flex flex-col items-center justify-center py-4 px-1 h-full"
          style={{ backgroundColor: color ? (isDark ? hexToRgba(color, 0.35) : darkenHex(color, 0.25)) : undefined }}
        >
          <span
            className="text-xs font-bold text-white/90 text-center leading-tight"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {noticeText || status}
          </span>
        </div>
      </div>
    );
  }

  const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const headerBg = color ? (isDark ? hexToRgba(color, 0.35) : darkenHex(color, 0.25)) : undefined;
  const columnBg = color
    ? isDark
      ? hexToRgba(color, 0.2)
      : color
    : isOver
      ? "hsl(var(--accent) / 0.5)"
      : "hsl(var(--muted) / 0.3)";

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className="flex w-12 flex-shrink-0 flex-col rounded-2xl overflow-hidden transition-colors h-full cursor-pointer"
        style={{ backgroundColor: columnBg }}
        onClick={onToggleCollapse}
      >
        <div
          className="flex flex-col items-center py-3 px-1 h-full"
          style={{ backgroundColor: headerBg }}
        >
          <ChevronRight className="h-4 w-4 text-white/80 mb-2 shrink-0" />
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white/90 shrink-0 mb-2"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
          >
            {deals.length}
          </span>
          <span
            className="text-xs font-bold text-white writing-vertical"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {status}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className="flex w-80 flex-shrink-0 flex-col rounded-2xl overflow-hidden transition-colors h-full"
      style={{ backgroundColor: columnBg }}
    >
      <div
        className="flex items-center justify-between px-3 h-[50px] max-h-[50px] cursor-pointer"
        style={{ backgroundColor: headerBg }}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{status}</h3>
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white/90 shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
          >
            {deals.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-white/85">
            {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/15"
            onClick={(e) => { e.stopPropagation(); onAddDeal(status); }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 min-h-[100px] overflow-y-auto">
        <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              tags={dealTagsMap[deal.id]}
              allTags={allTags}
              assignedProfile={deal.assigned_to ? profilesMap[deal.assigned_to] : null}
              hasOverdueTasks={overdueDeals.has(deal.id)}
              dailyColor={hasDailyColor ? (dailyColorsMap[deal.id] || "red") : undefined}
              nextTaskDeadline={nextTaskMap[deal.id]}
              channelIconKey={deal.acquisition_channel ? channelIconMap[deal.acquisition_channel] : undefined}
              currentStage={dealStageMap[deal.id]}
              onTagsChanged={onTagsChanged}
              onCapture={onCapture}
              onColorChange={onColorChange}
              onClick={() => onEditDeal(deal)}
            />
          ))}
          {showDropSpacer ? (
            <div className="min-h-[88px] rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 pointer-events-none" />
          ) : null}
        </SortableContext>
      </div>
    </div>
  );
}
