import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Flame, User, DollarSign, Calendar, Clock, Send, CheckCircle2, Trash2, Plus, X, XCircle, UserPlus } from "lucide-react";
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

interface CommentProfile {
  full_name: string | null;
  avatar_url: string | null;
}

interface DealDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: DealWithClient | null;
  statuses: string[];
  columnColor?: string;
  onUpdated: () => void;
}

export function DealDetailDialog({ open, onOpenChange, deal, statuses, columnColor, onUpdated }: DealDetailDialogProps) {
  const [comments, setComments] = useState<DealComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [heat, setHeat] = useState(0);
  const [dealTags, setDealTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, CommentProfile>>({});
  const { toast } = useToast();

  // Inline editing state
  const [editingField, setEditingField] = useState<"title" | "value" | "notes" | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchComments = useCallback(async () => {
    if (!deal) return;
    const { data } = await supabase
      .from("deal_comments")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: true });
    const commentsList = (data as DealComment[]) || [];
    setComments(commentsList);

    const userIds = [...new Set(commentsList.map((c) => c.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      const map: Record<string, CommentProfile> = {};
      (profiles || []).forEach((p: any) => {
        map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });
      setProfilesMap(map);
    }
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
      setEditingField(null);
      fetchComments();
      fetchTags();
      fetchAllTags();
    }
  }, [deal, open, fetchComments, fetchTags, fetchAllTags]);

  // Inline edit save
  const saveField = async (field: "title" | "value" | "notes") => {
    if (!deal) return;
    let updateData: Record<string, any> = {};
    if (field === "title") {
      const val = editTitle.trim();
      if (!val || val === deal.title) { setEditingField(null); return; }
      updateData = { title: val };
    } else if (field === "value") {
      const val = parseFloat(editValue) || 0;
      if (val === Number(deal.value || 0)) { setEditingField(null); return; }
      updateData = { value: val };
    } else if (field === "notes") {
      const val = editNotes.trim();
      if (val === (deal.notes || "")) { setEditingField(null); return; }
      updateData = { notes: val || null };
    }
    const { error } = await supabase.from("deals").update(updateData).eq("id", deal.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      onUpdated();
    }
    setEditingField(null);
  };

  const startEditing = (field: "title" | "value" | "notes") => {
    if (!deal) return;
    if (field === "title") setEditTitle(deal.title);
    else if (field === "value") setEditValue(String(deal.value || 0));
    else if (field === "notes") setEditNotes(deal.notes || "");
    setEditingField(field);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, field: "title" | "value" | "notes") => {
    if (e.key === "Enter" && field !== "notes") {
      e.preventDefault();
      saveField(field);
    } else if (e.key === "Escape") {
      setEditingField(null);
    }
  };

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

  const handleMarkAsLost = async () => {
    if (!deal) return;
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Negociação marcada como perdida" });
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
        <DialogHeader
          className="px-6 pt-6 pb-4 rounded-t-lg"
          style={columnColor ? { backgroundColor: columnColor } : undefined}
        >
          {editingField === "title" ? (
            <Input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => saveField("title")}
              onKeyDown={(e) => handleEditKeyDown(e, "title")}
              className="text-xl font-semibold bg-background/80"
            />
          ) : (
            <DialogTitle
              className={`text-xl cursor-pointer rounded px-1 -mx-1 hover:bg-white/20 transition-colors ${columnColor ? 'text-white' : ''}`}
              onClick={() => startEditing("title")}
            >
              {deal.title}
            </DialogTitle>
          )}
          <p className={`text-sm ${columnColor ? 'text-white/80' : 'text-muted-foreground'}`}>
            Status: <span className={`font-medium ${columnColor ? 'text-white' : 'text-foreground'}`}>{deal.status}</span>
          </p>
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
              {editingField === "value" ? (
                <Input
                  type="number"
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveField("value")}
                  onKeyDown={(e) => handleEditKeyDown(e, "value")}
                  className="h-7 w-32 text-sm"
                />
              ) : (
                <span
                  className="font-medium text-foreground cursor-pointer rounded px-1 -mx-1 hover:bg-accent transition-colors"
                  onClick={() => startEditing("value")}
                >
                  R$ {Number(deal.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
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

          {/* Notes - inline editable */}
          {editingField === "notes" ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Observações</p>
              <Textarea
                autoFocus
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                onBlur={() => saveField("notes")}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingField(null);
                  if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); saveField("notes"); }
                }}
                rows={3}
                className="resize-none"
                placeholder="Adicionar observações..."
              />
              <p className="text-xs text-muted-foreground">Ctrl+Enter para salvar, Esc para cancelar</p>
            </div>
          ) : (
            <div
              className="rounded-lg border border-border bg-muted/50 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => startEditing("notes")}
            >
              <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {deal.notes || <span className="italic text-muted-foreground">Clique para adicionar observações...</span>}
              </p>
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
              {comments.map((c) => {
                const profile = profilesMap[c.user_id];
                const initials = (profile?.full_name || "U")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                return (
                <div key={c.id} className="group/comment flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} />
                    ) : null}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {profile?.full_name || "Usuário"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleDeleteComment(c.id)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-0.5">{c.content}</p>
                  </div>
                </div>
                );
              })}
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
            <Button size="sm" variant="destructive" onClick={handleMarkAsLost}>
              <XCircle className="h-4 w-4 mr-1" />
              Perdida
            </Button>
            <Button size="sm" onClick={handleMarkAsSold} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Vendido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
