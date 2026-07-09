import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrackEditPayload {
  id?: string;
  funnel_id: string;
  start_column_id: string;
  end_column_id: string;
  color: string;
  label: string;
  row_index: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: TrackEditPayload | null;
  onSaved: () => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7",
  "#06b6d4", "#ec4899", "#64748b", "#0f172a",
];

export function TrackEditDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initial) {
      setLabel(initial.label || "");
      setColor(initial.color || "#3b82f6");
    }
  }, [initial]);

  if (!initial) return null;

  const handleSave = async () => {
    setSaving(true);
    const payload: any = {
      funnel_id: initial.funnel_id,
      start_column_id: initial.start_column_id,
      end_column_id: initial.end_column_id,
      color,
      label,
      row_index: initial.row_index,
    };
    const table = supabase.from("funnel_tracks" as any);
    const { error } = initial.id
      ? await table.update(payload).eq("id", initial.id)
      : await table.insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    onSaved();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!initial.id) return;
    if (!confirm("Excluir esta track?")) return;
    setSaving(true);
    const { error } = await supabase.from("funnel_tracks" as any).delete().eq("id", initial.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial.id ? "Editar track" : "Nova track"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Texto</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Etapa de qualificação" />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-10 cursor-pointer rounded border border-border"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {initial.id && (
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
