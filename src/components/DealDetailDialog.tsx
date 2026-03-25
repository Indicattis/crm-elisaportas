import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Flame, User, DollarSign, Calendar, Clock, Send, CheckCircle2, Pencil, Trash2, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

interface Tag {
  id: string;
  name: string;
  color: string;
}

type DealWithClient = Tables<"deals"> & { clients?: Tables<"clients"> | null };

interface DealComment {
  id: string;
  deal_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface DealDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: DealWithClient | null;
  statuses: string[];
  onEdit: (deal: DealWithClient) => void;
  onUpdated: () => void;
}

export function DealDetailDialog({ open, onOpenChange, deal, statuses, onEdit, onUpdated }: DealDetailDialogProps) {
  const [comments, setComments] = useState<DealComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [heat, setHeat] = useState(0);
  const [dealTags, setDealTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    if (!deal) return;
    const { data } = await supabase
      .from("deal_comments")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: true });
    setComments((data as DealComment[]) || []);
  }, [deal]);

  const fetchTags = useCallback(async () => {
    if (!deal) return;
    const { data } = await supabase
      .from("deal_tags")
      .select("tag_id, tags(id, name, color)")
      .eq("deal_id", deal.id);
    setDealTags((data || []).map((dt: any) => dt.tags).filter(Boolean));
  }, [deal]);

  const fetchAllTags = useCallback(async () => {
    const { data } = await supabase.from("tags").select("id, name, color").order("name");
    setAllTags(data || []);
  }, []);

  useEffect(() => {
    if (deal && open) {
      setHeat(deal.heat || 0);
      fetchComments();
      fetchTags();
      fetchAllTags();
    }
  }, [deal, open, fetchComments, fetchTags, fetchAllTags]);

  const handleAddTag = async (tagId: string) => {
    if (!deal) return;
    const { error } = await supabase.from("deal_tags").insert({ deal_id: deal.id, tag_id: tagId });
    if (error) {
      toast({ title: "Erro ao adicionar tag", description: error.message, variant: "destructive" });
    } else {
      fetchTags();
      onUpdated();
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!deal) return;
    const { error } = await supabase.from("deal_tags").delete().eq("deal_id", deal.id).eq("tag_id", tagId);
    if (error) {
      toast({ title: "Erro ao remover tag", description: error.message, variant: "destructive" });
    } else {
      fetchTags();
      onUpdated();
    }
  };

  const handleSendComment = async () => {
    if (!deal || !newComment.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("deal_comments").insert({
        deal_id: deal.id,
        user_id: user.id,
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      fetchComments();
    } catch (error: any) {
      toast({ title: "Erro ao comentar", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("deal_comments").delete().eq("id", commentId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      fetchComments();
    }
  };

  const handleHeatChange = async (level: number) => {
    if (!deal) return;
    const newHeat = heat === level ? 0 : level;
    setHeat(newHeat);
    const { error } = await supabase.from("deals").update({ heat: newHeat } as any).eq("id", deal.id);
    if (error) {
      toast({ title: "Erro ao atualizar calor", description: error.message, variant: "destructive" });
      setHeat((deal as any).heat || 0);
    } else {
      onUpdated();
    }
  };

  const handleMarkAsSold = async () => {
    if (!deal || statuses.length === 0) return;
    const lastStatus = statuses[statuses.length - 1];
    const { error } = await supabase.from("deals").update({ status: lastStatus }).eq("id", deal.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Negociação marcada como vendida!" });
      onUpdated();
      onOpenChange(false);
    }
  };

  if (!deal) return null;

  const daysInStage = Math.floor(
    (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">{deal.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">{deal.status}</span></p>
        </DialogHeader>

        <Separator />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Info section */}
          <div className="grid grid-cols-2 gap-4">
            {deal.clients && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium text-foreground">{deal.clients.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-medium text-foreground">
                R$ {Number(deal.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Criado em:</span>
              <span className="font-medium text-foreground">{format(new Date(deal.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Na etapa:</span>
              <span className={`font-medium ${daysInStage > 7 ? "text-destructive" : "text-foreground"}`}>
                {daysInStage === 0 ? "Hoje" : `${daysInStage} dias`}
              </span>
            </div>
          </div>

          {deal.notes && (
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{deal.notes}</p>
            </div>
          )}

          {/* Tags section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">Tags</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-1">
                    {allTags.filter((t) => !dealTags.some((dt) => dt.id === t.id)).map((tag) => (
                      <button
                        key={tag.id}
                        className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                        onClick={() => handleAddTag(tag.id)}
                      >
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </button>
                    ))}
                    {allTags.filter((t) => !dealTags.some((dt) => dt.id === t.id)).length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">Nenhuma tag disponível</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dealTags.map((tag) => (
                <Badge key={tag.id} style={{ backgroundColor: tag.color, color: "#fff" }} className="gap-1 pr-1">
                  {tag.name}
                  <button onClick={() => handleRemoveTag(tag.id)} className="ml-0.5 hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {dealTags.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Sem tags</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Comments section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Comentários e Histórico</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhum comentário ainda.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="group/comment flex items-start gap-2 rounded-lg border border-border p-3">
                  <div className="flex-1">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                    onClick={() => handleDeleteComment(c.id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário..."
                rows={2}
                className="flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
              />
              <Button size="icon" onClick={handleSendComment} disabled={sending || !newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => handleHeatChange(level)}
                className="p-1 rounded transition-colors hover:bg-muted"
                title={`Calor ${level}`}
              >
                <Flame
                  className={`h-5 w-5 transition-colors ${
                    level <= heat
                      ? "text-orange-500 fill-orange-500"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { onEdit(deal); onOpenChange(false); }}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button size="sm" onClick={handleMarkAsSold} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marcar como Vendido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
