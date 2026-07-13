import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, ChevronRight, ArrowUpDown } from "lucide-react";
import { useState, useEffect, memo } from "react";
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
  dealStageMap?: Record<string, { name: string; color: string; isRecurring?: boolean }>;
  taskProgressMap?: Record<string, { completed: number; total: number }>;
  startOfDayCount?: number;
  showDropSpacer?: boolean;
  isNotice?: boolean;
  noticeText?: string;
  hasDailyColor?: boolean;
  allowedDailyColors?: string[];
  isCreatedAtSort?: boolean;
  onToggleSort?: () => void;
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

export const KanbanColumn = memo(function KanbanColumn({
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
  taskProgressMap = {},
  startOfDayCount,
  showDropSpacer = false,
  isNotice = false,
  noticeText = "",
  hasDailyColor = true,
  allowedDailyColors,
  isCreatedAtSort = false,
  onToggleSort,
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

  return (
    <div
      ref={setNodeRef}
      className="flex flex-shrink-0 flex-col rounded-2xl overflow-hidden h-full transition-all duration-300 ease-in-out"
      style={{
        backgroundColor: columnBg,
        width: collapsed ? 48 : 320,
        minWidth: collapsed ? 48 : 320,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center h-[50px] max-h-[50px] cursor-pointer overflow-hidden"
        style={{ backgroundColor: headerBg }}
        onClick={onToggleCollapse}
      >
        {/* Collapsed header content */}
        <div
          className="flex flex-col items-center justify-center transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            width: collapsed ? 48 : 0,
            minWidth: collapsed ? 48 : 0,
            opacity: collapsed ? 1 : 0,
          }}
        >
          <ChevronRight
            className="h-4 w-4 text-white/80 shrink-0 transition-transform duration-300"
          />
        </div>

        {/* Expanded header content */}
        <div
          className="flex items-center justify-between flex-1 px-3 transition-all duration-300 ease-in-out"
          style={{
            opacity: collapsed ? 0 : 1,
            pointerEvents: collapsed ? "none" : "auto",
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {typeof startOfDayCount === "number" && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white/80 shrink-0"
                style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
                title="Cards no início do dia"
              >
                {startOfDayCount}
              </span>
            )}
            <span className="text-[10px] font-bold text-white/60 shrink-0">
              ---&gt;
            </span>
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white/90 shrink-0"
              style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
              title="Total de cards"
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
              className={`h-6 w-6 hover:bg-white/15 ${isCreatedAtSort ? "text-white" : "text-white/50 hover:text-white/80"}`}
              title={isCreatedAtSort ? "Ordenando por tempo na coluna" : "Ordem padrão"}
              onClick={(e) => { e.stopPropagation(); onToggleSort?.(); }}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </Button>
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
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Collapsed body: vertical text */}
        <div
          className="absolute inset-0 flex flex-col items-center pt-3 transition-opacity duration-300 ease-in-out"
          style={{
            opacity: collapsed ? 1 : 0,
            pointerEvents: collapsed ? "auto" : "none",
          }}
        >
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white/90 shrink-0 mb-2"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
          >
            {deals.length}
          </span>
          <span
            className="text-xs font-bold text-white"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {status}
          </span>
        </div>

        {/* Expanded body: column title + cards */}
        <div
          className="flex flex-1 flex-col min-h-[100px] overflow-hidden transition-opacity duration-300 ease-in-out"
          style={{
            opacity: collapsed ? 0 : 1,
            pointerEvents: collapsed ? "none" : "auto",
          }}
        >
          <h3
            className="relative z-30 mx-3 mt-3 mb-2 shrink-0 rounded-lg px-3 py-2 text-sm font-bold truncate text-white shadow-sm"
            style={{
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              backgroundColor: headerBg || columnBg || "hsl(var(--card))",
            }}
          >
            {status}
          </h3>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 min-h-0">
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
                  allowedDailyColors={allowedDailyColors}
                  nextTaskDeadline={nextTaskMap[deal.id]}
                  channelIconKey={deal.acquisition_channel ? channelIconMap[deal.acquisition_channel] : undefined}
                  currentStage={dealStageMap[deal.id]}
                  taskProgress={taskProgressMap[deal.id]}
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
      </div>
    </div>
  );
});
