import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

interface ChangePasswordModalProps {
  userId: string;
  onChanged: () => void;
}

export function ChangePasswordModal({ userId, onChanged }: ChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      toast({ title: "Erro", description: authError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ must_change_password: false } as any)
      .eq("id", userId);

    if (dbError) {
      toast({ title: "Erro", description: dbError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Senha alterada com sucesso!" });
    onChanged();
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Troca de Senha Obrigatória
          </DialogTitle>
          <DialogDescription>
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Alterando..." : "Alterar Senha"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
