import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase, type ExternalClient } from "@/integrations/external-supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createDealTasksForColumn } from "@/lib/deal-tasks";
import type { Tables } from "@/integrations/supabase/types";

type DealWithClient = Tables<"deals"> & { clients?: Tables<"clients"> | null };

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: DealWithClient | null;
  defaultStatus?: string;
  statuses: string[];
  funnelId: string;
  onSaved: () => void;
}

export function DealDialog({ open, onOpenChange, deal, defaultStatus, statuses, funnelId, onSaved }: DealDialogProps) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [externalClients, setExternalClients] = useState<ExternalClient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const searchClients = useCallback(async (query: string) => {
    setSearchLoading(true);
    try {
      let q = externalSupabase
        .from("clientes")
        .select("*")
        .eq("ativo", true)
        .order("nome")
        .limit(20);
      if (query.trim()) {
        q = q.ilike("nome", `%${query.trim()}%`);
      }
      const { data } = await q;
      setExternalClients((data as ExternalClient[]) || []);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (comboOpen) {
      searchClients(searchQuery);
    }
  }, [comboOpen]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchClients(value), 300);
  };

  useEffect(() => {
    if (deal) {
      setTitle(deal.title);
      setClientId(deal.client_id || "");
      setClientName(deal.clients?.name || "");
      setValue(deal.value ? String(deal.value) : "");
      setStatus(deal.status);
      setNotes(deal.notes || "");
      setChannel((deal as any).acquisition_channel || "");
    } else {
      setTitle("");
      setClientId("");
      setClientName("");
      setValue("");
      setStatus(defaultStatus || statuses[0] || "");
      setNotes("");
      setChannel("");
    }
    setShowNewClient(false);
    setNewClientName("");
    setNewClientEmail("");
    setNewClientPhone("");
    setSearchQuery("");
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
        acquisition_channel: channel || null,
        user_id: user.id,
        funnel_id: funnelId,
      } as any;

      if (deal) {
        const { error } = await supabase.from("deals").update(payload).eq("id", deal.id);
        if (error) throw error;
        toast({ title: "Negociação atualizada!" });
      } else {
        const { data: newDeal, error } = await supabase.from("deals").insert(payload).select("id").single();
        if (error) throw error;
        toast({ title: "Negociação criada!" });
        // Create tasks for the column if it has a task group
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
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="w-full justify-between font-normal"
                  >
                    {clientName || "Selecionar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar cliente..."
                      value={searchQuery}
                      onValueChange={handleSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {searchLoading ? "Buscando..." : "Nenhum cliente encontrado."}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setClientId("");
                            setClientName("");
                            setComboOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", !clientId ? "opacity-100" : "opacity-0")} />
                          Sem cliente
                        </CommandItem>
                        {externalClients.map((c) => (
                          <CommandItem
                            key={c.id}
                            onSelect={() => {
                              setClientId(c.id);
                              setClientName(c.nome);
                              setComboOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", clientId === c.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{c.nome}</span>
                              {(c.telefone || c.cidade) && (
                                <span className="text-xs text-muted-foreground">
                                  {[c.telefone, c.cidade].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
