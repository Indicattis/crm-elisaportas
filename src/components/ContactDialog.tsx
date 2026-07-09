import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StateCitySelect } from "@/components/StateCitySelect";
import { applyPhoneMask } from "@/lib/phone-mask";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface ContactRecord {
  id: string;
  funnel_id: string;
  column_id: string;
  user_id: string;
  name: string;
  phone: string | null;
  state: string | null;
  city: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: ContactRecord | null;
  funnelId: string;
  columnId: string;
  onSaved: () => void;
}

export function ContactDialog({ open, onOpenChange, contact, funnelId, columnId, onSaved }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone || "");
      setState(contact.state || "");
      setCity(contact.city || "");
      setNotes(contact.notes || "");
    } else {
      setName(""); setPhone(""); setState(""); setCity(""); setNotes("");
    }
  }, [contact, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const payload: any = {
        funnel_id: funnelId,
        column_id: columnId,
        user_id: user.id,
        name: name.replace(/[0-9]/g, "").trim(),
        phone: phone.trim() || null,
        state: state.trim() || null,
        city: city.trim() || null,
        notes: notes.trim() || null,
      };
      if (contact) {
        const { error } = await supabase.from("contacts" as any).update(payload).eq("id", contact.id);
        if (error) throw error;
        toast({ title: "Contato atualizado!" });
      } else {
        const { error } = await supabase.from("contacts" as any).insert(payload);
        if (error) throw error;
        toast({ title: "Contato criado!" });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("contacts" as any).delete().eq("id", contact.id);
      if (error) throw error;
      toast({ title: "Contato excluído!" });
      onSaved();
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
          <DialogTitle>{contact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value.replace(/[0-9]/g, ""))} required />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(applyPhoneMask(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
          <StateCitySelect state={state} city={city} onStateChange={setState} onCityChange={setCity} />
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-2 justify-end">
            {contact && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Excluir
              </Button>
            )}
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : contact ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
