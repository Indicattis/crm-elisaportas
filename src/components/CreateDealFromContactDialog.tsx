import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { ContactRecord } from "@/components/ContactDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactRecord;
  onCreated: () => void;
}

interface FunnelOpt { id: string; name: string; }
interface ColOpt { id: string; name: string; funnel_id: string; }

export function CreateDealFromContactDialog({ open, onOpenChange, contact, onCreated }: Props) {
  const [funnels, setFunnels] = useState<FunnelOpt[]>([]);
  const [columns, setColumns] = useState<ColOpt[]>([]);
  const [funnelId, setFunnelId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    supabase.from("funnels").select("id, name").order("name").then(({ data }) => {
      setFunnels(data || []);
      if (data && data.length && !funnelId) setFunnelId(contact.funnel_id || data[0].id);
    });
  }, [open]);

  useEffect(() => {
    if (!funnelId) return;
    supabase
      .from("funnel_columns")
      .select("id, name, funnel_id, column_type, is_notice")
      .eq("funnel_id", funnelId)
      .order("position")
      .then(({ data }) => {
        const list = (data || []).filter((c: any) => {
          const t = c.column_type || (c.is_notice ? "notice" : "deals");
          return t === "deals";
        });
        setColumns(list);
        if (list.length) setStatus(list[0].name);
      });
  }, [funnelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !funnelId || !status) return;
    setLoading(true);
    try {
      const { data: newDeal, error } = await supabase
        .from("deals")
        .insert({
          title: contact.name,
          phone: contact.phone,
          state: contact.state,
          city: contact.city,
          notes: contact.notes,
          status,
          funnel_id: funnelId,
          user_id: user.id,
          assigned_to: user.id,
          contact_id: contact.id,
          value: 0,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      if (newDeal) {
        await supabase.from("deal_history").insert({
          deal_id: newDeal.id,
          event_type: "creation",
          description: `Negociação criada a partir do contato "${contact.name}"`,
          user_id: user.id,
        });
      }
      toast({ title: "Negociação criada!" });
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar negociação — {contact.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Funil</Label>
            <Select value={funnelId} onValueChange={setFunnelId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {funnels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Etapa</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Selecionar etapa..." /></SelectTrigger>
              <SelectContent>
                {columns.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !status}>{loading ? "Criando..." : "Criar negociação"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
