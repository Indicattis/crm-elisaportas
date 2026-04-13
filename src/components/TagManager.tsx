import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Tag {
  id: string;
  name: string;
  color: string;
}

const COLOR_OPTIONS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
];

export function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[6]);
  const { toast } = useToast();

  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase.from("tags").select("id, name, color").order("created_at");
    if (error) {
      toast({ title: "Erro ao carregar tags", description: error.message, variant: "destructive" });
    } else {
      setTags(data || []);
    }
  }, [toast]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName("");
    setColor(COLOR_OPTIONS[6]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editingId) {
        const { error } = await supabase.from("tags").update({ name: name.trim(), color }).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Tag atualizada!" });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Não autenticado");
        const { error } = await supabase.from("tags").insert({ name: name.trim(), color, user_id: user.id });
        if (error) throw error;
        toast({ title: "Tag criada!" });
      }
      resetForm();
      fetchTags();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta tag?")) return;
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tag excluída!" });
      fetchTags();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Tags</h2>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Tag
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <Input
            placeholder="Nome da tag"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Cor:</span>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                className={`h-6 w-6 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" /> {editingId ? "Salvar" : "Criar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {tags.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground italic">Nenhuma tag criada.</p>
      )}

      <div className="space-y-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <Badge style={{ backgroundColor: tag.color, color: "#fff" }}>{tag.name}</Badge>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(tag)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(tag.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
