import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type DealWithClient = Tables<"deals"> & { clients?: Tables<"clients"> | null };

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: DealWithClient | null;
  defaultStatus?: string;
  clients: Tables<"clients">[];
  statuses: string[];
  funnelId: string;
  onSaved: () => void;
}

export function DealDialog({ open, onOpenChange, deal, defaultStatus, clients, statuses, funnelId, onSaved }: DealDialogProps) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (deal) {
      setTitle(deal.title);
      setClientId(deal.client_id || "");
      setValue(deal.value ? String(deal.value) : "");
      setStatus(deal.status);
      setNotes(deal.notes || "");
    } else {
      setTitle("");
      setClientId("");
      setValue("");
      setStatus(defaultStatus || statuses[0] || "");
      setNotes("");
    }
    setShowNewClient(false);
    setNewClientName("");
    setNewClientEmail("");
    setNewClientPhone("");
  }, [deal, defaultStatus, open, statuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let finalClientId: string | null = clientId && clientId !== "none" ? clientId : null;

      if (showNewClient && newClientName.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({ name: newClientName.trim(), email: newClientEmail.trim() || null, phone: newClientPhone.trim() || null, user_id: user.id })
          .select()
          .single();
        if (clientError) throw clientError;
        finalClientId = newClient.id;
      }

      const payload = {
        title,
        client_id: finalClientId,
        value: value ? parseFloat(value) : 0,
        status,
        notes: notes || null,
        user_id: user.id,
        funnel_id: funnelId,
      };

      if (deal) {
        const { error } = await supabase.from("deals").update(payload).eq("id", deal.id);
        if (error) throw error;
        toast({ title: "Negociação atualizada!" });
      } else {
        const { error } = await supabase.from("deals").insert(payload);
        if (error) throw error;
        toast({ title: "Negociação criada!" });
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cliente</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => {
                  setShowNewClient(!showNewClient);
                  if (!showNewClient) setClientId("");
                }}
              >
                {showNewClient ? (
                  <><X className="h-3 w-3 mr-1" /> Cancelar</>
                ) : (
                  <><UserPlus className="h-3 w-3 mr-1" /> Novo Cliente</>
                )}
              </Button>
            </div>
            {showNewClient ? (
              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} required placeholder="Nome do cliente" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">E-mail</Label>
                    <Input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </div>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Detalhes da negociação..." />
          </div>
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
