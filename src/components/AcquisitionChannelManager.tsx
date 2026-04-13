import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ChannelIconPicker } from "@/components/ChannelIconPicker";
import { getChannelIcon } from "@/lib/channel-icons";

interface Channel {
  id: string;
  name: string;
  icon: string;
  position: number;
}

function SortableChannelItem({ ch, onEdit, onDelete }: { ch: Channel; onEdit: (ch: Channel) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ch.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const iconData = getChannelIcon(ch.icon);
  const Icon = iconData.icon;

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
          <Icon className="h-5 w-5" />
          <span className="font-medium text-sm">{ch.name}</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(ch)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(ch.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AcquisitionChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("megaphone");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("acquisition_channels")
      .select("*")
      .order("position");
    if (error) {
      toast({ title: "Erro ao carregar canais", description: error.message, variant: "destructive" });
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = channels.findIndex(c => c.id === active.id);
    const newIndex = channels.findIndex(c => c.id === over.id);
    const reordered = arrayMove(channels, oldIndex, newIndex);
    setChannels(reordered);

    // Persist new positions
    await Promise.all(
      reordered.map((ch, i) =>
        supabase.from("acquisition_channels").update({ position: i }).eq("id", ch.id)
      )
    );
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setIcon("megaphone");
    setDialogOpen(true);
  };

  const openEdit = (ch: Channel) => {
    setEditing(ch);
    setName(ch.name);
    setIcon(ch.icon);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (editing) {
        const { error } = await supabase.from("acquisition_channels").update({ name: name.trim(), icon }).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Canal atualizado!" });
      } else {
        const { error } = await supabase.from("acquisition_channels").insert({
          name: name.trim(),
          icon,
          position: channels.length,
          user_id: user.id,
        });
        if (error) throw error;
        toast({ title: "Canal criado!" });
      }
      setDialogOpen(false);
      fetchChannels();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este canal?")) return;
    const { error } = await supabase.from("acquisition_channels").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Canal excluído!" });
      fetchChannels();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Canais de Aquisição</h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Canal
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : channels.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum canal cadastrado.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={channels.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {channels.map((ch) => (
                <SortableChannelItem key={ch.id} ch={ch} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Canal" : "Novo Canal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Google Ads" />
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <ChannelIconPicker value={icon} onChange={setIcon} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
