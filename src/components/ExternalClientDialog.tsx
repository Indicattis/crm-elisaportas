import { useState, useEffect } from "react";
import { externalSupabase, type ExternalClient } from "@/integrations/external-supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ExternalClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ExternalClientDialog({ open, onOpenChange, onSaved }: ExternalClientDialogProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [tipoCliente, setTipoCliente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [fidelizado, setFidelizado] = useState(false);
  const [parceiro, setParceiro] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setNome(""); setTelefone(""); setEmail(""); setCpfCnpj("");
      setCidade(""); setEstado(""); setCep(""); setEndereco("");
      setBairro(""); setTipoCliente(""); setObservacoes("");
      setFidelizado(false); setParceiro(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      const { error } = await externalSupabase.from("clientes").insert({
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        email: email.trim() || null,
        cpf_cnpj: cpfCnpj.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        cep: cep.trim() || null,
        endereco: endereco.trim() || null,
        bairro: bairro.trim() || null,
        tipo_cliente: tipoCliente.trim() || null,
        observacoes: observacoes.trim() || null,
        fidelizado,
        parceiro,
        ativo: true,
      });
      if (error) throw error;
      toast({ title: "Cliente cadastrado!" });
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
      <DialogContent className="glass-strong sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Nome do cliente" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>CPF/CNPJ</Label>
            <Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={estado} onChange={e => setEstado(e.target.value)} placeholder="UF" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input value={cep} onChange={e => setCep(e.target.value)} placeholder="00000-000" />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, número" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Cliente</Label>
            <Input value={tipoCliente} onChange={e => setTipoCliente(e.target.value)} placeholder="Ex: PF, PJ" />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações..." />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={fidelizado} onCheckedChange={setFidelizado} />
              <Label>Fidelizado</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={parceiro} onCheckedChange={setParceiro} />
              <Label>Parceiro</Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
