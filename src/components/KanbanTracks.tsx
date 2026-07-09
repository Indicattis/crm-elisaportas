import { useEffect, useLayoutEffect, useMemo, useRef, useState, RefObject } from "react";
import { Plus } from "lucide-react";
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
  columns: Column[]; // ordered as displayed
  tracks: FunnelTrack[];
  funnelId: string;
  isAdmin: boolean;
  columnsRowRef: RefObject<HTMLDivElement>;
  onChanged: () => void;
}

const ROW_HEIGHT = 30;
const ROW_GAP = 4;

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

export function KanbanTracks({ columns, tracks, funnelId, isAdmin, columnsRowRef, onChanged }: Props) {
  const [rects, setRects] = useState<Record<string, { left: number; width: number }>>({});
  const [totalWidth, setTotalWidth] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrackEditPayload | null>(null);
  const [dragSelection, setDragSelection] = useState<{ row: number; startColId: string; endColId: string } | null>(null);
  const dragging = useRef<{ row: number; startColId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const rowEl = columnsRowRef.current;
    if (!rowEl) return;
    const compute = () => {
      const next: Record<string, { left: number; width: number }> = {};
      const children = Array.from(rowEl.children) as HTMLElement[];
      columns.forEach((c, i) => {
        const el = children[i];
        if (!el) return;
        next[c.id] = { left: el.offsetLeft, width: el.offsetWidth };
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

  const getTrackStyle = (startId: string, endId: string) => {
    const sIdx = posById[startId];
    const eIdx = posById[endId];
    if (sIdx === undefined || eIdx === undefined) return null;
    const [aId, bId] = sIdx <= eIdx ? [startId, endId] : [endId, startId];
    const a = rects[aId];
    const b = rects[bId];
    if (!a || !b) return null;
    return { left: a.left, width: b.left + b.width - a.left };
  };

  const maxRow = tracks.reduce((m, t) => Math.max(m, t.row_index), -1);
  const rowsCount = maxRow + 1 + (isAdmin ? 1 : 0);

  const findColAtX = (x: number): string | null => {
    // x relative to columnsRow
    let best: { id: string; dist: number } | null = null;
    for (const [id, r] of Object.entries(rects)) {
      if (x >= r.left && x <= r.left + r.width) return id;
      const center = r.left + r.width / 2;
      const dist = Math.abs(center - x);
      if (!best || dist < best.dist) best = { id, dist };
    }
    return best?.id ?? null;
  };

  const handlePointerDown = (e: React.PointerEvent, row: number) => {
    if (!isAdmin) return;
    if ((e.target as HTMLElement).closest("[data-track-item]")) return;
    const rowEl = columnsRowRef.current;
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colId = findColAtX(x);
    if (!colId) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { row, startColId: colId };
    setDragSelection({ row, startColId: colId, endColId: colId });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const rowEl = columnsRowRef.current;
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colId = findColAtX(x);
    if (!colId) return;
    setDragSelection((prev) => (prev ? { ...prev, endColId: colId } : prev));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const sel = dragSelection;
    dragging.current = null;
    setDragSelection(null);
    if (!sel) return;
    // Normalize
    const sIdx = posById[sel.startColId];
    const eIdx = posById[sel.endColId];
    const [start, end] = sIdx <= eIdx ? [sel.startColId, sel.endColId] : [sel.endColId, sel.startColId];
    setEditing({
      funnel_id: funnelId,
      start_column_id: start,
      end_column_id: end,
      color: "#3b82f6",
      label: "",
      row_index: sel.row,
    });
    setDialogOpen(true);
  };

  const openEdit = (t: FunnelTrack) => {
    if (!isAdmin) return;
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

  if (columns.length === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
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
            onPointerDown={(e) => handlePointerDown(e, row)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {isAdmin && row === rowsCount - 1 && (
              <div className="pointer-events-none flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-muted-foreground/50">
                <Plus className="h-3 w-3 mr-1" /> arraste para criar uma track
              </div>
            )}
          </div>
        ))}

        {tracks.map((t) => {
          const style = getTrackStyle(t.start_column_id, t.end_column_id);
          if (!style) return null;
          return (
            <button
              key={t.id}
              data-track-item
              type="button"
              onClick={() => openEdit(t)}
              disabled={!isAdmin}
              className="absolute rounded-md shadow-sm flex items-center justify-center px-2 text-xs font-semibold truncate transition-all hover:brightness-95"
              style={{
                left: style.left,
                width: style.width,
                top: t.row_index * (ROW_HEIGHT + ROW_GAP),
                height: ROW_HEIGHT,
                backgroundColor: t.color,
                color: hexContrast(t.color),
                cursor: isAdmin ? "pointer" : "default",
              }}
              title={t.label}
            >
              <span className="truncate">{t.label || "(sem texto)"}</span>
            </button>
          );
        })}

        {dragSelection && (() => {
          const style = getTrackStyle(dragSelection.startColId, dragSelection.endColId);
          if (!style) return null;
          return (
            <div
              className="absolute rounded-md border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
              style={{
                left: style.left,
                width: style.width,
                top: dragSelection.row * (ROW_HEIGHT + ROW_GAP),
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
