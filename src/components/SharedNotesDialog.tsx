import { useEffect, useState } from "react";
import { Notebook, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export function SharedNotesDialog() {
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("shared_notes")
        .select("id, content, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        if (error) {
          toast.error("Erro ao carregar notas");
        } else if (data) {
          setId(data.id);
          setContent(data.content ?? "");
          setUpdatedAt(data.updated_at);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("shared_notes")
      .update({ content, updated_at: new Date().toISOString(), updated_by: user.user?.id })
      .eq("id", id)
      .select("updated_at")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    if (data) setUpdatedAt(data.updated_at);
    toast.success("Notas salvas");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Notebook className="h-4 w-4" />
          Notas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        <div className="bg-[#fef9c3] dark:bg-yellow-950/40 border border-yellow-300/60 dark:border-yellow-800/60 rounded-lg overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-yellow-300/60 dark:border-yellow-800/60 bg-yellow-100/60 dark:bg-yellow-900/40">
            <DialogTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <Notebook className="h-5 w-5" />
              Bloco de Notas {isAdmin ? "" : "(somente leitura)"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={!isAdmin || loading}
              placeholder={isAdmin ? "Escreva aqui suas anotações compartilhadas..." : "Sem anotações"}
              className="min-h-[60vh] w-full resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-yellow-950 dark:text-yellow-50 font-serif text-base leading-[1.8] p-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.8em - 1px), rgba(180,140,40,0.25) calc(1.8em - 1px), rgba(180,140,40,0.25) 1.8em)",
              }}
            />
          </div>

          <div className="flex items-center justify-between px-6 py-3 border-t border-yellow-300/60 dark:border-yellow-800/60 bg-yellow-100/60 dark:bg-yellow-900/40">
            <span className="text-xs text-yellow-900/70 dark:text-yellow-100/70">
              {updatedAt
                ? `Atualizado em ${format(new Date(updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                : ""}
            </span>
            {isAdmin ? (
              <Button onClick={handleSave} disabled={saving || loading} size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            ) : (
              <span className="text-xs text-yellow-900/70 dark:text-yellow-100/70">Somente leitura</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
