import { useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReturnDateFieldProps {
  deal: { id: string; return_date?: string | null } & Record<string, any>;
  onUpdated: () => void;
}

export function ReturnDateField({ deal, onUpdated }: ReturnDateFieldProps) {
  const { toast } = useToast();
  const current = (deal as any).return_date ? new Date((deal as any).return_date) : null;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(current || undefined);
  const [time, setTime] = useState<string>(current ? format(current, "HH:mm") : "09:00");
  const [saving, setSaving] = useState(false);

  const isPast = current && current < new Date();

  const save = async () => {
    if (!date) return;
    setSaving(true);
    const [h, m] = time.split(":").map(Number);
    const combined = new Date(date);
    combined.setHours(h || 0, m || 0, 0, 0);
    const { error } = await supabase
      .from("deals")
      .update({ return_date: combined.toISOString() } as any)
      .eq("id", deal.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    onUpdated();
    setOpen(false);
  };

  const clear = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("deals")
      .update({ return_date: null } as any)
      .eq("id", deal.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setDate(undefined);
    setTime("09:00");
    onUpdated();
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-background/60 border border-border/50 px-3 py-2">
      <div className={cn(
        "flex items-center justify-center h-7 w-7 rounded-full shrink-0",
        isPast ? "bg-destructive/15" : "bg-primary/10"
      )}>
        <CalendarClock className={cn("h-3.5 w-3.5", isPast ? "text-destructive" : "text-primary")} />
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-sm cursor-pointer hover:text-primary transition-colors flex-1 text-left"
          >
            {current ? (
              <span className={cn("font-medium", isPast ? "text-destructive" : "text-foreground")}>
                Retorno: {format(current, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
              </span>
            ) : (
              <span className="italic text-muted-foreground">Definir data para retorno</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="flex items-center gap-2 border-t p-3">
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-8 w-28"
            />
            <Button size="sm" onClick={save} disabled={!date || saving} className="ml-auto">
              Salvar
            </Button>
            {current && (
              <Button size="sm" variant="ghost" onClick={clear} disabled={saving} title="Limpar">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
