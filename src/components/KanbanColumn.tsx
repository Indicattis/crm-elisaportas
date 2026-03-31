import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
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
  showDropSpacer?: boolean;
  onTagsChanged?: (dealId: string, tagId: string, checked: boolean) => void;
  onCapture?: (dealId: string) => void;
  onAddDeal: (status: string) => void;
  onEditDeal: (deal: Deal) => void;
}

...

export function KanbanColumn({ status, color, deals, dealTagsMap = {}, allTags = [], profilesMap = {}, overdueDeals = new Set(), showDropSpacer = false, onTagsChanged, onCapture, onAddDeal, onEditDeal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));

...

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 p-3 min-h-[100px] overflow-y-auto">
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              tags={dealTagsMap[deal.id]}
              allTags={allTags}
              assignedProfile={(deal as any).assigned_to ? profilesMap[(deal as any).assigned_to] : null}
              hasOverdueTasks={overdueDeals.has(deal.id)}
              onTagsChanged={onTagsChanged}
              onCapture={onCapture}
              onClick={() => onEditDeal(deal)}
            />
          ))}
          {showDropSpacer && (
            <div className="min-h-[88px] rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 pointer-events-none" />
          )}
        </SortableContext>
      </div>
    </div>
  );
}
