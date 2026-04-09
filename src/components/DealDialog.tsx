import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createDealTasksForColumn } from "@/lib/deal-tasks";
import { StateCitySelect } from "@/components/StateCitySelect";
import { applyPhoneMask } from "@/lib/phone-mask";
import { getChannelIcon } from "@/lib/channel-icons";
import { useUserRole } from "@/contexts/RoleContext";
import type { Tables } from "@/integrations/supabase/types";

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Tables<"deals"> | null;
  defaultStatus?: string;
  statuses: string[];
  funnelId: string;
  onSaved: () => void;
}

export function DealDialog({ open, onOpenChange, deal, defaultStatus, statuses, funnelId, onSaved }: DealDialogProps) {
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ title: string; status: string; assignedName: string } | null>(null);
  const [channelOptions, setChannelOptions] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { toast } = useToast();
  const { role } = useUserRole();

  const checkDuplicatePhone = useCallback((phoneValue: string, currentDealId?: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const digits = phoneValue.replace(/\D/g, "");
    if (digits.length < 4) {
      setDuplicateInfo(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      let query = supabase.from("deals").select("id, title, status, assigned_to, phone").ilike("phone", `%${digits.split("").join("%")}%`);
      if (currentDealId) query = query.neq("id", currentDealId);
      const { data } = await query.limit(1).maybeSingle();
      if (data) {
        let assignedName = "Não atribuído";
        if (data.assigned_to) {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.assigned_to).maybeSingle();
          if (profile?.full_name) assignedName = profile.full_name;
        }
        setDuplicateInfo({ title: data.title, status: data.status, assignedName });
      } else {
        setDuplicateInfo(null);
      }
    }, 500);
  }, []);

  useEffect(() => {
    supabase.from("acquisition_channels").select("id, name, icon").order("position").then(({ data }) => {
      if (data) setChannelOptions(data);
    });
  }, []);

  useEffect(() => {
    if (deal) {
      setTitle(deal.title);
      setPhone((deal as any).phone || "");
      setEmail((deal as any).email || "");
      setValue(deal.value ? String(deal.value) : "");
      setStatus(deal.status);
      setChannel((deal as any).acquisition_channel || "");
      setState((deal as any).state || "");
      setCity((deal as any).city || "");
    } else {
      setTitle("");
      setPhone("");
      setEmail("");
      setValue("");
      setStatus(defaultStatus || statuses[0] || "");
      setChannel("");
      setState("");
      setCity("");
    }
    setDuplicateInfo(null);
  }, [deal, defaultStatus, open, statuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload = {
        title,
        phone: phone.trim(),
        email: email.trim() || null,
        value: value ? parseFloat(value) : 0,
        status,
        acquisition_channel: channel && channel !== "none" ? channel : null,
        state: state.trim() || null,
        city: city.trim() || null,
        user_id: user.id,
        funnel_id: funnelId,
      } as any;

      if (deal) {
        const { error } = await supabase.from("deals").update(payload).eq("id", deal.id);
        if (error) throw error;
        toast({ title: "Negociação atualizada!" });
      } else {
        payload.assigned_to = user.id;
        const { data: newDeal, error } = await supabase.from("deals").insert(payload).select("id").single();
        if (error) throw error;
        toast({ title: "Negociação criada!" });
        if (newDeal) {
          await createDealTasksForColumn(newDeal.id, status, funnelId);
        }
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deal) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("deals").delete().eq("id", deal.id);
      if (error) throw error;
      toast({ title: "Negociação excluída!" });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{deal ? "Editar Negociação" : "Nova Negociação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Porta automática loja centro" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input value={phone} onChange={(e) => {
                const masked = applyPhoneMask(e.target.value);
                setPhone(masked);
                checkDuplicatePhone(masked, deal?.id);
              }} required placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          {duplicateInfo && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-sm">
                Telefone já cadastrado na negociação <strong>{duplicateInfo.title}</strong> (etapa: {duplicateInfo.status}), atendido por <strong>{duplicateInfo.assignedName}</strong>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Canal de Aquisição</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue placeholder="Selecionar canal..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem canal</SelectItem>
                {channelOptions.map((c) => {
                  const iconData = getChannelIcon(c.icon);
                  const Icon = iconData.icon;
                  return (
                    <SelectItem key={c.id} value={c.name}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {c.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <StateCitySelect
            state={state}
            city={city}
            onStateChange={setState}
            onCityChange={setCity}
          />
          <div className="flex gap-2 justify-end">
            {deal && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Excluir
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : deal ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
