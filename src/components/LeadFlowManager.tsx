import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getChannelIcon } from "@/lib/channel-icons";

interface LeadFlow {
  id: string;
  name: string;
  funnel_id: string;
  status: string;
  acquisition_channel: string | null;
  active: boolean;
  created_at: string;
}

interface Funnel {
  id: string;
  name: string;
}

interface FunnelColumn {
  id: string;
  name: string;
  color: string;
}

interface Channel {
  id: string;
  name: string;
  icon: string;
}

export function LeadFlowManager() {
  const [flows, setFlows] = useState<LeadFlow[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<LeadFlow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [funnelId, setFunnelId] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const fetchFlows = useCallback(async () => {
    const { data } = await supabase.from("lead_flows").select("*").order("created_at", { ascending: false });
    setFlows((data as LeadFlow[]) || []);
  }, []);

  const fetchFunnels = useCallback(async () => {
    const { data } = await supabase.from("funnels").select("id, name").order("position");
    setFunnels(data || []);
  }, []);

  const fetchChannels = useCallback(async () => {
    const { data } = await supabase.from("acquisition_channels").select("id, name, icon").order("position");
    setChannels(data || []);
  }, []);

  useEffect(() => {
    fetchFlows();
    fetchFunnels();
    fetchChannels();
  }, [fetchFlows, fetchFunnels, fetchChannels]);

  const fetchColumnsForFunnel = useCallback(async (fId: string) => {
    if (!fId) { setColumns([]); return; }
    const { data } = await supabase.from("funnel_columns").select("id, name, color").eq("funnel_id", fId).order("position");
    setColumns(data || []);
  }, []);

  useEffect(() => {
    fetchColumnsForFunnel(funnelId);
  }, [funnelId, fetchColumnsForFunnel]);

  const openCreate = () => {
    setEditingFlow(null);
    setName("");
    setFunnelId(funnels[0]?.id || "");
    setStatus("");
    setChannel("");
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (flow: LeadFlow) => {
    setEditingFlow(flow);
    setName(flow.name);
    setFunnelId(flow.funnel_id);
    setStatus(flow.status);
    setChannel(flow.acquisition_channel || "");
    setActive(flow.active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !funnelId || !status) {
      toast({ title: "Preencha nome, funil e coluna", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const payload = {
      name: name.trim(),
      funnel_id: funnelId,
      status,
      acquisition_channel: channel || null,
      active,
      user_id: user.id,
    };

    if (editingFlow) {
      const { error } = await supabase.from("lead_flows").update(payload).eq("id", editingFlow.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Fluxo atualizado!" });
    } else {
      const { error } = await supabase.from("lead_flows").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Fluxo criado!" });
    }
    setLoading(false);
    setDialogOpen(false);
    fetchFlows();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este fluxo?")) return;
    await supabase.from("lead_flows").delete().eq("id", id);
    toast({ title: "Fluxo excluído!" });
    fetchFlows();
  };

  const copyEmbed = (flow: LeadFlow) => {
    const url = `${window.location.origin}/lead-form?flow_id=${flow.id}`;
    const code = `<iframe src="${url}" width="100%" height="500" frameborder="0" style="border:none;"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopiedId(flow.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFunnelName = (id: string) => funnels.find(f => f.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Fluxos de Captação</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Novo Fluxo
        </Button>
      </div>

      {flows.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum fluxo cadastrado. Crie um para começar a captar leads automaticamente.</p>
      )}

      <div className="space-y-3">
        {flows.map((flow) => {
          const ChannelIcon = flow.acquisition_channel ? getChannelIcon(flow.acquisition_channel) : null;
          return (
            <Card key={flow.id} className={!flow.active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {flow.name}
                    {!flow.active && <span className="text-xs text-muted-foreground">(inativo)</span>}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(flow)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(flow.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Funil: <strong className="text-foreground">{getFunnelName(flow.funnel_id)}</strong></span>
                  <span>Coluna: <strong className="text-foreground">{flow.status}</strong></span>
                  {flow.acquisition_channel && (
                    <span className="flex items-center gap-1">
                      Canal: {ChannelIcon && <ChannelIcon className="h-3.5 w-3.5" />}
                      <strong className="text-foreground">{flow.acquisition_channel}</strong>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyEmbed(flow)}>
                    {copiedId === flow.id ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    Embed
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/lead-form?flow_id=${flow.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFlow ? "Editar Fluxo" : "Novo Fluxo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Google Ads Landing" />
            </div>

            <div className="space-y-1.5">
              <Label>Funil *</Label>
              <Select value={funnelId} onValueChange={v => { setFunnelId(v); setStatus(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar funil" /></SelectTrigger>
                <SelectContent>
                  {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Coluna / Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                <SelectContent>
                  {columns.map(c => (
                    <SelectItem key={c.id} value={c.name}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Canal de Aquisição</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue placeholder="Nenhum (padrão)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Nenhum</SelectItem>
                  {channels.map(c => {
                    const Icon = getChannelIcon(c.name);
                    return (
                      <SelectItem key={c.id} value={c.name}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          {c.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Ativo</Label>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={loading}>
              {editingFlow ? "Salvar" : "Criar Fluxo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
