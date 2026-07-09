import { useEffect, useLayoutEffect, useMemo, useRef, useState, RefObject } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrackEditDialog, TrackEditPayload } from "./TrackEditDialog";

export interface FunnelTrack {
  id: string;
  funnel_id: string;
  start_column_id: string;
  end_column_id: string;
  color: string;
  label: string;
  row_index: number;
}

interface Column {
  id: string;
  name: string;
  position: number;
}

interface Props {
  columns: Column[];
  tracks: FunnelTrack[];
  funnelId: string;
  isAdmin: boolean;
  columnsRowRef: RefObject<HTMLDivElement>;
  onChanged: () => void;
}

const ROW_HEIGHT = 44;
const ROW_GAP = 0;


function hexContrast(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return l > 0.6 ? "#0f172a" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}

type DragState =
  | { mode: "create"; row: number; anchorColId: string; currentColId: string }
  | { mode: "resize"; trackId: string; edge: "left" | "right"; row: number; startColId: string; endColId: string }
  | null;

export function KanbanTracks({ columns, tracks, funnelId, isAdmin, columnsRowRef, onChanged }: Props) {
  const [rects, setRects] = useState<Record<string, { left: number; width: number }>>({});
  const [totalWidth, setTotalWidth] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrackEditPayload | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const dragRef = useRef<DragState>(null);
  const suppressClickRef = useRef(false);
  const [optimistic, setOptimistic] = useState<Record<string, { start_column_id: string; end_column_id: string }>>({});
  const { toast } = useToast();


  useLayoutEffect(() => {
    const rowEl = columnsRowRef.current;
    if (!rowEl) return;
    const compute = () => {
      const next: Record<string, { left: number; width: number }> = {};
      const rowRect = rowEl.getBoundingClientRect();
      columns.forEach((c) => {
        const el = rowEl.querySelector<HTMLElement>(`[data-column-id="${c.id}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        next[c.id] = { left: r.left - rowRect.left, width: r.width };
      });
      setRects(next);
      setTotalWidth(rowEl.scrollWidth);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(rowEl);
    Array.from(rowEl.children).forEach((el) => ro.observe(el as Element));
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [columns, columnsRowRef]);


  const posById = useMemo(() => {
    const m: Record<string, number> = {};
    columns.forEach((c, i) => (m[c.id] = i));
    return m;
  }, [columns]);

  const getStyleFromIds = (startId: string, endId: string) => {
    const sIdx = posById[startId];
    const eIdx = posById[endId];
    if (sIdx === undefined || eIdx === undefined) return null;
    const [aId, bId] = sIdx <= eIdx ? [startId, endId] : [endId, startId];
    const a = rects[aId];
    const b = rects[bId];
    if (!a || !b) return null;
    return { left: a.left, width: b.left + b.width - a.left };
  };

  const findColAtX = (x: number): string | null => {
    let best: { id: string; dist: number } | null = null;
    for (const [id, r] of Object.entries(rects)) {
      if (x >= r.left && x <= r.left + r.width) return id;
      const center = r.left + r.width / 2;
      const dist = Math.abs(center - x);
      if (!best || dist < best.dist) best = { id, dist };
    }
    return best?.id ?? null;
  };

  // Global pointer handling for smoother drags (works even if pointer leaves element)
  useEffect(() => {
    if (!drag) return;
    const handleMove = (ev: PointerEvent) => {
      const rowEl = columnsRowRef.current;
      if (!rowEl) return;
      const rect = rowEl.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const colId = findColAtX(x);
      if (!colId) return;
      const current = dragRef.current;
      if (!current) return;
      if (current.mode === "create") {
        if (current.currentColId !== colId) {
          const next = { ...current, currentColId: colId };
          dragRef.current = next;
          setDrag(next);
        }
      } else {
        // resize
        if (current.edge === "left" && current.startColId !== colId) {
          const next = { ...current, startColId: colId };
          dragRef.current = next;
          setDrag(next);
        } else if (current.edge === "right" && current.endColId !== colId) {
          const next = { ...current, endColId: colId };
          dragRef.current = next;
          setDrag(next);
        }
      }
    };
    const handleUp = async () => {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current) return;
      if (current.mode === "resize") {
        suppressClickRef.current = true;
        setTimeout(() => { suppressClickRef.current = false; }, 300);
      }

      if (current.mode === "create") {
        const sIdx = posById[current.anchorColId];
        const eIdx = posById[current.currentColId];
        const [start, end] = sIdx <= eIdx
          ? [current.anchorColId, current.currentColId]
          : [current.currentColId, current.anchorColId];
        setEditing({
          funnel_id: funnelId,
          start_column_id: start,
          end_column_id: end,
          color: "#3b82f6",
          label: "",
          row_index: current.row,
        });
        setDialogOpen(true);
      } else {
        // resize: normalize and persist
        const sIdx = posById[current.startColId];
        const eIdx = posById[current.endColId];
        const [start, end] = sIdx <= eIdx
          ? [current.startColId, current.endColId]
          : [current.endColId, current.startColId];
        const { error } = await supabase
          .from("funnel_tracks" as any)
          .update({ start_column_id: start, end_column_id: end })
          .eq("id", current.trackId);
        if (error) {
          toast({ title: "Erro ao redimensionar", description: error.message, variant: "destructive" });
        }
        onChanged();
      }
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [drag, columnsRowRef, posById, funnelId, onChanged, toast]);

  const startCreate = (e: React.PointerEvent, row: number) => {
    if (!isAdmin) return;
    if ((e.target as HTMLElement).closest("[data-track-item]")) return;
    const rowEl = columnsRowRef.current;
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colId = findColAtX(x);
    if (!colId) return;
    e.preventDefault();
    const next: DragState = { mode: "create", row, anchorColId: colId, currentColId: colId };
    dragRef.current = next;
    setDrag(next);
  };

  const startResize = (e: React.PointerEvent, t: FunnelTrack, edge: "left" | "right") => {
    if (!isAdmin) return;
    e.stopPropagation();
    e.preventDefault();
    const next: DragState = {
      mode: "resize",
      trackId: t.id,
      edge,
      row: t.row_index,
      startColId: t.start_column_id,
      endColId: t.end_column_id,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const openEdit = (t: FunnelTrack) => {
    if (!isAdmin) return;
    if (drag) return;
    if (suppressClickRef.current) return;
    setEditing({

      id: t.id,
      funnel_id: t.funnel_id,
      start_column_id: t.start_column_id,
      end_column_id: t.end_column_id,
      color: t.color,
      label: t.label,
      row_index: t.row_index,
    });
    setDialogOpen(true);
  };

  const hasTracks = tracks.length > 0;
  const rowsCount = hasTracks || isAdmin ? 1 : 0;

  if (columns.length === 0) return null;

  // Build live-view of tracks (apply in-progress resize)
  const displayTracks = tracks.map((t) => {
    if (drag && drag.mode === "resize" && drag.trackId === t.id) {
      return { ...t, start_column_id: drag.startColId, end_column_id: drag.endColId };
    }
    return t;
  });


  return (
    <>
      <div
        className="relative"
        style={{
          width: totalWidth || undefined,
          height: rowsCount > 0 ? rowsCount * ROW_HEIGHT + Math.max(0, rowsCount - 1) * ROW_GAP : 0,
        }}
      >
        {Array.from({ length: rowsCount }).map((_, row) => (
          <div
            key={`row-${row}`}
            className={`absolute left-0 right-0 ${isAdmin ? "cursor-crosshair" : ""}`}
            style={{ top: row * (ROW_HEIGHT + ROW_GAP), height: ROW_HEIGHT }}
            onPointerDown={(e) => startCreate(e, row)}
          >
            {isAdmin && row === rowsCount - 1 && (
              <div className="pointer-events-none flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-muted-foreground/50">
                <Plus className="h-3 w-3 mr-1" /> arraste para criar uma track
              </div>
            )}
          </div>
        ))}

        {displayTracks.map((t) => {
          const style = getStyleFromIds(t.start_column_id, t.end_column_id);
          if (!style) return null;
          const isResizing = drag && drag.mode === "resize" && drag.trackId === t.id;
          return (
            <div
              key={t.id}
              data-track-item
              className={`group absolute rounded-md shadow-sm flex items-center justify-center px-2 text-xs font-semibold hover:brightness-95 ${isResizing ? "ring-2 ring-primary" : ""}`}
              style={{
                left: style.left,
                width: style.width,
                top: 0,
                height: ROW_HEIGHT,
                backgroundColor: t.color,
                color: hexContrast(t.color),
                cursor: isAdmin ? "pointer" : "default",
                transition: "left 150ms ease-out, width 150ms ease-out, background-color 150ms ease-out",
              }}

              title={t.label}
              onClick={() => openEdit(t)}
            >
              {isAdmin && (
                <div
                  onPointerDown={(e) => startResize(e, t, "left")}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md bg-black/0 hover:bg-black/20 group-hover:bg-black/10"
                  title="Arraste para redimensionar"
                />
              )}
              <span className="truncate pointer-events-none px-2">{t.label || "(sem texto)"}</span>
              {isAdmin && (
                <div
                  onPointerDown={(e) => startResize(e, t, "right")}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-black/0 hover:bg-black/20 group-hover:bg-black/10"
                  title="Arraste para redimensionar"
                />
              )}
            </div>
          );
        })}

        {drag && drag.mode === "create" && (() => {
          const style = getStyleFromIds(drag.anchorColId, drag.currentColId);
          if (!style) return null;
          return (
            <div
              className="absolute rounded-md border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
              style={{
                left: style.left,
                width: style.width,
                top: drag.row * (ROW_HEIGHT + ROW_GAP),
                height: ROW_HEIGHT,
              }}
            />
          );
        })()}
      </div>

      <TrackEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={onChanged}
      />
    </>
  );
}
