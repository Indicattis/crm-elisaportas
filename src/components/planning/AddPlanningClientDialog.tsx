import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Temperature } from "@/pages/SalesPlanning";

interface AddPlanningClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerName: string;
  onSubmit: (payload: { name: string; value: number; temperature: Temperature }) => Promise<void> | void;
}

export function AddPlanningClientDialog({
  open,
  onOpenChange,
  sellerName,
  onSubmit,
}: AddPlanningClientDialogProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [temperature, setTemperature] = useState<Temperature>("hot");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setValue("");
      setTemperature("hot");
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSubmit({
      name: name.trim(),
      value: parseFloat(value.replace(",", ".")) || 0,
      temperature,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar cliente</DialogTitle>
          <DialogDescription>Coluna de {sellerName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="planning-name">Nome</Label>
            <Input
              id="planning-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="planning-value">Valor (R$)</Label>
            <Input
              id="planning-value"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Temperatura</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemperature("hot")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
                  temperature === "hot"
                    ? "border-red-500 bg-red-500/10 text-red-500 shadow-inner"
                    : "border-border/60 text-muted-foreground hover:border-border",
                )}
              >
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Quente
              </button>
              <button
                type="button"
                onClick={() => setTemperature("warm")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
                  temperature === "warm"
                    ? "border-amber-500 bg-amber-500/10 text-amber-500 shadow-inner"
                    : "border-border/60 text-muted-foreground hover:border-border",
                )}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Morno
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
