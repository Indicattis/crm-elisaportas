import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Funnel {
  id: string;
  name: string;
  position: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnel?: Funnel | null;
  onSaved: () => void;
}

export function FunnelDialog({ open, onOpenChange, funnel, onSaved }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  useEffect(() => {
    setName(funnel?.name || "");
  }, [funnel, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!authUser) throw new Error("Não autenticado");
      const user = authUser;

      if (funnel) {
        const { error } = await supabase.from("funnels").update({ name }).eq("id", funnel.id);
        if (error) throw error;
        toast({ title: "Funil atualizado!" });
      } else {
        const { error } = await supabase.from("funnels").insert({
          name,
          user_id: user.id,
          position: 0,
        });
        if (error) throw error;
        toast({ title: "Funil criado!" });
      }
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{funnel ? "Editar Funil" : "Novo Funil"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Funil</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Vendas, Pós-venda..." />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : funnel ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
