import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { FunnelColumnList } from "@/components/FunnelColumnList";
import { FunnelDialog } from "@/components/FunnelDialog";
import { TagManager } from "@/components/TagManager";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Pencil, Trash2, GitBranch, Tag, ArrowLeft, Users } from "lucide-react";
import { TeamManager } from "@/components/TeamManager";
import { useToast } from "@/hooks/use-toast";

interface Funnel {
  id: string;
  name: string;
  position: number;
}

interface FunnelColumn {
  id: string;
  funnel_id: string;
  name: string;
  color: string;
  position: number;
}

export default function CrmConfig() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  const [activeSection, setActiveSection] = useState<null | "funnels" | "tags">(null);
  const { toast } = useToast();

  const fetchFunnels = useCallback(async () => {
    const { data, error } = await supabase
      .from("funnels")
      .select("*")
      .order("position");
    if (error) {
      toast({ title: "Erro ao carregar funis", description: error.message, variant: "destructive" });
    } else {
      setFunnels(data || []);
      if (!selectedFunnelId && data && data.length > 0) {
        setSelectedFunnelId(data[0].id);
      }
    }
  }, [toast, selectedFunnelId]);

  const fetchColumns = useCallback(async () => {
    if (!selectedFunnelId) return;
    const { data, error } = await supabase
      .from("funnel_columns")
      .select("*")
      .eq("funnel_id", selectedFunnelId)
      .order("position");
    if (error) {
      toast({ title: "Erro ao carregar colunas", description: error.message, variant: "destructive" });
    } else {
      setColumns(data || []);
    }
  }, [selectedFunnelId, toast]);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);
  useEffect(() => { fetchColumns(); }, [fetchColumns]);

  const handleDeleteFunnel = async () => {
    if (!selectedFunnelId) return;
    if (!confirm("Excluir este funil e todas as suas colunas?")) return;
    const { error } = await supabase.from("funnels").delete().eq("id", selectedFunnelId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Funil excluído!" });
      setSelectedFunnelId("");
      fetchFunnels();
    }
  };

  const selectedFunnel = funnels.find((f) => f.id === selectedFunnelId) || null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        {activeSection === null && (
          <>
            <h1 className="text-2xl font-bold text-foreground">Configuração do CRM</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40"
                onClick={() => setActiveSection("funnels")}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <GitBranch className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Funis</CardTitle>
                      <CardDescription>Gerencie seus funis e colunas</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40"
                onClick={() => setActiveSection("tags")}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Tag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Tags</CardTitle>
                      <CardDescription>Gerencie suas tags de negociação</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </>
        )}

        {activeSection === "funnels" && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setActiveSection(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Funis</h1>

            <div className="flex items-center gap-3">
              <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecionar funil" />
                </SelectTrigger>
                <SelectContent>
                  {funnels.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button size="sm" onClick={() => { setEditingFunnel(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Novo Funil
              </Button>

              {selectedFunnel && (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setEditingFunnel(selectedFunnel); setDialogOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDeleteFunnel}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {selectedFunnelId && (
              <FunnelColumnList
                funnelId={selectedFunnelId}
                columns={columns}
                onChanged={fetchColumns}
              />
            )}
          </>
        )}

        {activeSection === "tags" && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setActiveSection(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <TagManager />
          </>
        )}
      </div>

      <FunnelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        funnel={editingFunnel}
        onSaved={() => { fetchFunnels(); }}
      />
    </div>
  );
}
