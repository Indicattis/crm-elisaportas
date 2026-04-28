import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { StateCitySelect } from "./StateCitySelect";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

interface EntryRequirement {
  field_name: string;
}

const FIELD_LABELS: Record<string, string> = {
  phone: "Telefone",
  email: "E-mail",
  value: "Valor",
  state: "Estado",
  city: "Cidade",
  acquisition_channel: "Canal de aquisição",
  notes: "Notas",
  return_date: "Data de retorno",
  task: "Tarefa obrigatória",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
  requirements: EntryRequirement[];
  targetStatus: string;
  funnelId: string;
  onConfirm: () => void;
}

export function EntryRequirementsModal({
  open,
  onOpenChange,
  deal,
  requirements,
  targetStatus,
  funnelId,
  onConfirm,
}: Props) {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [channels, setChannels] = useState<{ name: string }[]>([]);

  // Form state for missing fields
  const [phone, setPhone] = useState(deal.phone || "");
  const [email, setEmail] = useState(deal.email || "");
  const [value, setValue] = useState(deal.value != null ? String(deal.value) : "");
  const [state, setState] = useState(deal.state || "");
  const [city, setCity] = useState(deal.city || "");
  const [channel, setChannel] = useState(deal.acquisition_channel || "");
  const [notes, setNotes] = useState(deal.notes || "");

  // Task fields
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDate, setTaskDate] = useState<Date | undefined>(undefined);

  // Return date fields
  const initialReturn = deal.return_date ? new Date(deal.return_date) : undefined;
  const [returnDate, setReturnDate] = useState<Date | undefined>(initialReturn);
  const [returnTime, setReturnTime] = useState<string>(
    initialReturn ? format(initialReturn, "HH:mm") : "09:00"
  );

  const [saving, setSaving] = useState(false);

  // Determine which fields are actually missing
  const missingFields = requirements.filter((r) => {
    if (r.field_name === "task") return true; // always show task form
    const val = deal[r.field_name as keyof Deal];
    return val === null || val === undefined || val === "" || val === 0;
  });

  useEffect(() => {
    if (requirements.some((r) => r.field_name === "acquisition_channel")) {
      supabase.from("acquisition_channels").select("name").order("position").then(({ data }) => {
        setChannels(data || []);
      });
    }
  }, [requirements]);

  const handleConfirm = async () => {
    // Validate required fields
    for (const req of missingFields) {
      if (req.field_name === "task") {
        if (!taskDescription.trim() || !taskDate) {
          toast({ title: "Preencha a tarefa", description: "Descrição e data são obrigatórios.", variant: "destructive" });
          return;
        }
        continue;
      }

      if (req.field_name === "return_date") {
        if (!returnDate) {
          toast({ title: "Campo obrigatório", description: "Preencha: Data de retorno", variant: "destructive" });
          return;
        }
        continue;
      }

      const fieldValue = {
        phone, email, value, state, city,
        acquisition_channel: channel, notes,
      }[req.field_name];

      if (!fieldValue || (typeof fieldValue === "string" && !fieldValue.trim())) {
        toast({ title: "Campo obrigatório", description: `Preencha: ${FIELD_LABELS[req.field_name]}`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      // Update deal with filled fields
      const dealFieldReqs = missingFields.filter((r) => r.field_name !== "task");
      if (dealFieldReqs.length > 0) {
        let returnDateIso: string | null = null;
        if (returnDate) {
          const [hh, mm] = (returnTime || "09:00").split(":").map((n) => parseInt(n, 10));
          const combined = new Date(returnDate);
          combined.setHours(hh || 0, mm || 0, 0, 0);
          returnDateIso = combined.toISOString();
        }
        const vals: Record<string, any> = {
          phone, email, notes, state, city,
          acquisition_channel: channel,
          value: value ? parseFloat(value) : null,
          return_date: returnDateIso,
        };
        const updates: any = {};
        for (const req of dealFieldReqs) {
          updates[req.field_name] = vals[req.field_name];
        }
        const { error: dealErr } = await supabase.from("deals").update(updates as any).eq("id", deal.id);
        if (dealErr) {
          toast({ title: "Erro ao atualizar negociação", description: dealErr.message, variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      // Create task if required
      if (requirements.some((r) => r.field_name === "task") && taskDate) {
        if (authUser) {
          // Preserve local timezone — set to noon local to avoid UTC drift
          const localDeadline = new Date(taskDate);
          localDeadline.setHours(12, 0, 0, 0);

          const { error: taskErr } = await supabase.from("deal_tasks").insert({
            deal_id: deal.id,
            description: taskDescription.trim(),
            deadline_at: localDeadline.toISOString(),
            type: "personalizada",
          });
          if (taskErr) {
            toast({ title: "Erro ao criar tarefa", description: taskErr.message, variant: "destructive" });
            setSaving(false);
            return;
          }
        }
      }

      onConfirm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requisitos para "{targetStatus}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Preencha os campos obrigatórios para mover a negociação.
          </p>

          {missingFields.map((req) => {
            if (req.field_name === "phone") {
              return (
                <div key="phone" className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
              );
            }
            if (req.field_name === "email") {
              return (
                <div key="email" className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
              );
            }
            if (req.field_name === "value") {
              return (
                <div key="value" className="space-y-1.5">
                  <Label>Valor</Label>
                  <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
                </div>
              );
            }
            if (req.field_name === "state" || req.field_name === "city") {
              // Render state+city together only once
              if (req.field_name === "city" && missingFields.some((r) => r.field_name === "state")) return null;
              return (
                <div key="state-city" className="space-y-1.5">
                  <Label>Localização</Label>
                  <StateCitySelect state={state} city={city} onStateChange={setState} onCityChange={setCity} />
                </div>
              );
            }
            if (req.field_name === "acquisition_channel") {
              return (
                <div key="channel" className="space-y-1.5">
                  <Label>Canal de aquisição</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {channels.map((ch) => (
                        <SelectItem key={ch.name} value={ch.name}>{ch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            if (req.field_name === "notes") {
              return (
                <div key="notes" className="space-y-1.5">
                  <Label>Notas</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações..." rows={3} />
                </div>
              );
            }
            if (req.field_name === "return_date") {
              return (
                <div key="return_date" className="space-y-1.5">
                  <Label>Data de retorno</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !returnDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {returnDate ? format(returnDate, "dd/MM/yyyy") : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={returnDate}
                          onSelect={setReturnDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              );
            }
            if (req.field_name === "task") {
              return (
                <div key="task" className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                  <Label className="font-semibold">Criar tarefa obrigatória</Label>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <Input value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Descrição da tarefa..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Data limite</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !taskDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {taskDate ? format(taskDate, "dd/MM/yyyy") : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={taskDate}
                          onSelect={setTaskDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Salvando..." : "Confirmar e mover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
