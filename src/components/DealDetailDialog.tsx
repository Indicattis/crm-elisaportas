import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";
import { createDealTasksForColumn, deletePendingDealTasks } from "@/lib/deal-tasks";
import { StateCitySelect } from "@/components/StateCitySelect";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, User, UserMinus, DollarSign, Calendar as CalendarIcon, Clock, Send, CheckCircle2, Trash2, Plus, X, XCircle, Phone, Mail, MapPin, ClipboardList, MessageSquare, PhoneCall, CheckSquare, Square, AlertTriangle, ArrowRightLeft, History, Repeat, Archive, ArchiveRestore, RefreshCw, ImagePlus, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useUserRole } from "@/contexts/RoleContext";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

const formatPhoneForWhatsapp = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
};

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface DealAttachment {
  id: string;
  deal_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

type DealData = Tables<"deals">;

interface DealComment {
  id: string;
  deal_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface DealTask {
  id: string;
  deal_id: string;
  type: string;
  description: string | null;
  deadline_at: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  template_id: string | null;
  next_recurrence_at: string | null;
}

interface DealHistoryEvent {
  id: string;
  deal_id: string;
  user_id: string;
  event_type: string;
  description: string;
  metadata: any;
  created_at: string;
}

interface CommentProfile {
  full_name: string | null;
  avatar_url: string | null;
}

interface DealDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: DealData | null;
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
  const [assignedProfile, setAssignedProfile] = useState<CommentProfile | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [dealTasks, setDealTasks] = useState<DealTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [reloadingTasks, setReloadingTasks] = useState(false);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<DealHistoryEvent[]>([]);
  const [historyProfiles, setHistoryProfiles] = useState<Record<string, CommentProfile>>({});
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskType, setNewTaskType] = useState("personalizada");
  const [newTaskDeadlineHours, setNewTaskDeadlineHours] = useState(24);
  const [newTaskDeadlineMode, setNewTaskDeadlineMode] = useState<"hours" | "days" | "date">("hours");
  const [newTaskDeadlineDays, setNewTaskDeadlineDays] = useState(1);
  const [newTaskDeadlineDate, setNewTaskDeadlineDate] = useState<Date | undefined>(undefined);
  const [creatingTask, setCreatingTask] = useState(false);
  const [showLossReasonDialog, setShowLossReasonDialog] = useState(false);
  const [selectedLossReason, setSelectedLossReason] = useState<string>("");
  const [showArchiveReasonDialog, setShowArchiveReasonDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [showDisqualifyDialog, setShowDisqualifyDialog] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allowedActions, setAllowedActions] = useState<string[]>(["sold", "lost", "disqualified"]);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<DealAttachment[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();
  const { role } = useUserRole();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

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

  const fetchAssignedProfile = useCallback(async () => {
    if (!deal || !(deal as any).assigned_to) { setAssignedProfile(null); return; }
    const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", (deal as any).assigned_to).single();
    setAssignedProfile(data || null);
  }, [deal]);

  const fetchDealTasks = useCallback(async (dealId?: string) => {
    const id = dealId || deal?.id;
    if (!id) return;
    setLoadingTasks(true);
    const [{ data }] = await Promise.all([
      supabase
        .from("deal_tasks")
        .select("*")
        .eq("deal_id", id)
        .order("completed", { ascending: true })
        .order("deadline_at", { ascending: true }),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]);
    const tasks = (data as DealTask[]) || [];
    setDealTasks(tasks);
    setLoadingTasks(false);

    // Check for overdue tasks and create notifications (dedup by task id)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const overdueTasks = tasks.filter(t => !t.completed && new Date(t.deadline_at) < new Date());
      for (const task of overdueTasks) {
        const taskDesc = task.description || (task.type === "mensagem" ? "Enviar mensagem" : task.type === "ligacao" ? "Realizar ligação" : "Tarefa");
        // Check if we already notified for this task
        const { data: existing } = await (supabase.from("notifications") as any)
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "task_overdue")
          .eq("deal_id", id)
          .ilike("message", `%${task.id.slice(0, 8)}%`)
          .limit(1);
        if (!existing || existing.length === 0) {
          await (supabase.from("notifications") as any).insert({
            user_id: user.id,
            deal_id: id,
            type: "task_overdue",
            title: "Tarefa vencida",
            message: `"${taskDesc}" venceu em ${deal?.title || "negociação"} [${task.id.slice(0, 8)}]`,
          });
        }
      }
    }
  }, [deal?.id, deal?.title]);

  const fetchHistory = useCallback(async () => {
    if (!deal) return;
    const { data } = await supabase
      .from("deal_history")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: false }) as { data: DealHistoryEvent[] | null };
    const events = data || [];
    setHistory(events);

    const userIds = [...new Set(events.map(e => e.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const map: Record<string, CommentProfile> = {};
      (profiles || []).forEach((p: any) => { map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
      setHistoryProfiles(prev => ({ ...prev, ...map }));
    }
  }, [deal]);

  const fetchAttachments = useCallback(async () => {
    if (!deal) return;
    const { data } = await supabase
      .from("deal_attachments")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: false });
    setAttachments((data as DealAttachment[]) || []);
  }, [deal]);

  const handleUploadImage = async (file: File) => {
    if (!deal || uploadingImage) return;
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${deal.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("deal-attachments")
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("deal_attachments").insert({
        deal_id: deal.id,
        user_id: user.id,
        file_path: filePath,
        file_name: file.name || `image.${ext}`,
      } as any);
      if (insertError) throw insertError;
      fetchAttachments();
      toast({ title: "Imagem anexada!" });
    } catch (err: any) {
      toast({ title: "Erro ao anexar imagem", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteAttachment = async (attachment: DealAttachment) => {
    try {
      await supabase.storage.from("deal-attachments").remove([attachment.file_path]);
      await supabase.from("deal_attachments").delete().eq("id", attachment.id);
      fetchAttachments();
      toast({ title: "Anexo removido" });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadImage(file);
          return;
        }
      }
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    const updateData: any = { completed };
    if (completed) {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = user?.id || null;

      // Start animation
      setCompletingTaskIds(prev => new Set(prev).add(taskId));

      // Wait for animation to finish before persisting
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      updateData.completed_at = null;
      updateData.completed_by = null;
    }
    await supabase.from("deal_tasks").update(updateData).eq("id", taskId);

    // Log history for task completion
    if (completed && deal && user) {
      const task = dealTasks.find(t => t.id === taskId);
      const taskDesc = task?.description || (task?.type === "mensagem" ? "Enviar mensagem" : task?.type === "ligacao" ? "Realizar ligação" : "Tarefa");
      await supabase.from("deal_history").insert({
        deal_id: deal.id,
        user_id: user.id,
        event_type: "task_completed",
        description: `Concluiu tarefa: ${taskDesc}`,
        metadata: { task_id: taskId, task_type: task?.type },
      } as any);
    }

    setCompletingTaskIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    fetchDealTasks();
    fetchHistory();
  };

  const handleCreateManualTask = async () => {
    if (!deal || creatingTask) return;
    setCreatingTask(true);
    try {
      let deadline: Date;
      if (newTaskDeadlineMode === "days") {
        deadline = new Date(Date.now() + newTaskDeadlineDays * 24 * 60 * 60 * 1000);
      } else if (newTaskDeadlineMode === "date" && newTaskDeadlineDate) {
        deadline = new Date(newTaskDeadlineDate);
        deadline.setHours(23, 59, 59, 0);
      } else {
        deadline = new Date(Date.now() + newTaskDeadlineHours * 60 * 60 * 1000);
      }
      const { error } = await supabase.from("deal_tasks").insert({
        deal_id: deal.id,
        type: newTaskType,
        description: newTaskDesc.trim() || null,
        deadline_at: deadline.toISOString(),
      } as any);
      if (error) throw error;
      setNewTaskDesc("");
      setNewTaskType("personalizada");
      setNewTaskDeadlineHours(24);
      setNewTaskDeadlineMode("hours");
      setNewTaskDeadlineDays(1);
      setNewTaskDeadlineDate(undefined);
      setShowNewTask(false);
      fetchDealTasks();
    } catch (err: any) {
      toast({ title: "Erro ao criar tarefa", description: err.message, variant: "destructive" });
    } finally {
      setCreatingTask(false);
    }
  };
  const handleReloadTasks = async () => {
    if (!deal || reloadingTasks) return;
    setReloadingTasks(true);
    try {
      await deletePendingDealTasks(deal.id);
      if (deal.funnel_id) {
        await createDealTasksForColumn(deal.id, deal.status, deal.funnel_id);
      }
      await fetchDealTasks(deal.id);
      toast({ title: "Tarefas recarregadas" });
    } catch (err: any) {
      toast({ title: "Erro ao recarregar", description: err.message, variant: "destructive" });
    } finally {
      setReloadingTasks(false);
    }
  };


  useEffect(() => {
    if (deal && open) {
      setHeat(deal.heat || 0);
      setEditingField(null);
      setDealTasks([]);
      fetchComments();
      fetchTags();
      fetchAllTags();
      fetchAssignedProfile();
      
      fetchDealTasks(deal.id);
      fetchHistory();
      fetchAttachments();

      // Fetch allowed actions for the current column
      if (deal.funnel_id && deal.status) {
        supabase
          .from("funnel_columns")
          .select("allowed_actions")
          .eq("funnel_id", deal.funnel_id)
          .eq("name", deal.status)
          .maybeSingle()
          .then(({ data }) => {
            setAllowedActions((data as any)?.allowed_actions || ["sold", "lost", "disqualified"]);
          });
      }
    }
  }, [deal?.id, deal?.updated_at, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local fields only when deal ID or updated_at changes (not on every reference change)
  useEffect(() => {
    if (deal && open) {
      setHeat(deal.heat || 0);
      setEditPhone((deal as any).phone || "");
      setEditEmail((deal as any).email || "");
      setEditState((deal as any).state || "");
      setEditCity((deal as any).city || "");
    }
  }, [deal?.id, deal?.updated_at, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inline edit save
  const saveField = async (field: "title" | "value" | "notes") => {
    if (!deal) return;
    let updateData: Partial<{ title: string; value: number; notes: string | null }> = {};
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
      // Notify deal owner and assigned user about comment
      const notifyUserIds = new Set<string>();
      if (deal.user_id) notifyUserIds.add(deal.user_id);
      if ((deal as any).assigned_to) notifyUserIds.add((deal as any).assigned_to);
      notifyUserIds.delete(user.id); // don't notify self
      for (const uid of notifyUserIds) {
        await createNotification({
          userId: uid,
          dealId: deal.id,
          type: "comment",
          title: "Novo comentário",
          message: `Comentário em "${deal.title}": ${newComment.trim().slice(0, 80)}`,
        });
      }
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

  const LOSS_REASONS = [
    "Perca por orçamento",
    "Perca por prazo",
    "Perca por qualidade",
    "Perca por logística",
    "Perca por atendimento",
  ];

  const handleDisqualify = () => {
    setDisqualifyReason("");
    setShowDisqualifyDialog(true);
  };

  const confirmDisqualify = async () => {
    if (!deal || !disqualifyReason.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("deals").update({
        status: "Desqualificada",
        loss_reason: disqualifyReason.trim(),
      } as any).eq("id", deal.id);
      if (error) throw error;
      if (user) {
        await supabase.from("deal_history").insert({
          deal_id: deal.id,
          user_id: user.id,
          event_type: "disqualified",
          description: `Desqualificou: ${disqualifyReason.trim()}`,
        } as any);
      }
      toast({ title: "Negociação desqualificada" });
      setShowDisqualifyDialog(false);
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao desqualificar", description: err.message, variant: "destructive" });
    }
  };

  const handleMarkAsLost = () => {
    setSelectedLossReason("");
    setShowLossReasonDialog(true);
  };

  const confirmMarkAsLost = async () => {
    if (!deal || !selectedLossReason) return;
    const { error } = await supabase.from("deals").update({ status: "Perdida", loss_reason: selectedLossReason } as any).eq("id", deal.id);
    if (error) {
      toast({ title: "Erro ao marcar como perdida", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Negociação marcada como perdida" });
      setShowLossReasonDialog(false);
      onUpdated();
      onOpenChange(false);
    }
  };

  const handleLeaveDeal = async () => {
    if (!deal) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("deals").update({ assigned_to: null } as any).eq("id", deal.id);
      if (error) throw error;
      await supabase.from("deal_history").insert({
        deal_id: deal.id,
        user_id: user.id,
        event_type: "unassign",
        description: "Saiu da negociação",
      } as any);
      toast({ title: "Você saiu da negociação" });
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // Delegation state
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [funnelMembers, setFunnelMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [delegating, setDelegating] = useState(false);

  const fetchFunnelMembers = useCallback(async () => {
    if (!deal?.funnel_id) return;
    // Get funnel members + funnel owner
    const [{ data: members }, { data: funnel }] = await Promise.all([
      supabase.from("funnel_members").select("user_id").eq("funnel_id", deal.funnel_id),
      supabase.from("funnels").select("user_id").eq("id", deal.funnel_id).single(),
    ]);
    const userIds = new Set<string>();
    (members || []).forEach((m) => userIds.add(m.user_id));
    if (funnel?.user_id) userIds.add(funnel.user_id);
    // Remove currently assigned user
    if (deal.assigned_to) userIds.delete(deal.assigned_to);

    if (userIds.size === 0) { setFunnelMembers([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", [...userIds]);
    setFunnelMembers((profiles || []).map((p) => ({ id: p.id, full_name: p.full_name })));
  }, [deal?.funnel_id, deal?.assigned_to]);

  useEffect(() => {
    if (delegateOpen) fetchFunnelMembers();
  }, [delegateOpen, fetchFunnelMembers]);

  const handleDelegate = async (targetUserId: string, targetName: string) => {
    if (!deal) return;
    setDelegating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("deals").update({ assigned_to: targetUserId } as any).eq("id", deal.id);
      if (error) throw error;
      await supabase.from("deal_history").insert({
        deal_id: deal.id,
        user_id: user.id,
        event_type: "delegation",
        description: `Delegou para ${targetName}`,
      } as any);
      await createNotification({
        userId: targetUserId,
        dealId: deal.id,
        type: "delegation",
        title: "Negociação delegada",
        message: `Você foi designado para a negociação "${deal.title}"`,
      });
      toast({ title: `Delegado para ${targetName}` });
      setDelegateOpen(false);
      onUpdated();
    } catch (err: any) {
      toast({ title: "Erro ao delegar", description: err.message, variant: "destructive" });
    } finally {
      setDelegating(false);
    }
  };


  if (!deal) return null;

  const msInStage = Date.now() - new Date(deal.updated_at).getTime();
  const daysInStage = Math.floor(msInStage / (1000 * 60 * 60 * 24));
  const hoursInStage = Math.floor(msInStage / (1000 * 60 * 60));

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0" onPaste={handlePaste}>
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
              className={`text-xl cursor-pointer rounded px-1 -mx-1 hover:bg-white/20 transition-colors max-w-[50%] truncate ${columnColor ? 'text-white' : ''}`}
              onClick={() => startEditing("title")}
            >
              {(deal as any).deal_number && <span className="opacity-60 font-normal mr-1">#{(deal as any).deal_number}</span>}
              {deal.title}
            </DialogTitle>
          )}
          <div className="flex items-center justify-between">
            <p className={`text-sm ${columnColor ? 'text-white/80' : 'text-muted-foreground'}`}>
              Status: <span className={`font-medium ${columnColor ? 'text-white' : 'text-foreground'}`}>{deal.status}</span>
            </p>
            {assignedProfile ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 border-2 border-white/30">
                  {assignedProfile.avatar_url ? (
                    <AvatarImage src={assignedProfile.avatar_url} alt={assignedProfile.full_name || ""} />
                  ) : null}
                  <AvatarFallback className="text-[10px] bg-white/20 text-white">
                    {(assignedProfile.full_name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className={`text-sm font-medium ${columnColor ? 'text-white' : 'text-foreground'}`}>
                  {assignedProfile.full_name}
                </span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                Sem responsável
              </Badge>
            )}
          </div>
          {/* Tags in header */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {dealTags.map((tag) => (
              <Badge key={tag.id} style={{ backgroundColor: tag.color, color: "#fff" }} className="gap-1 pr-1 text-[11px] h-5">
                {tag.name}
                <button onClick={() => handleRemoveTag(tag.id)} className="ml-0.5 hover:opacity-70">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className={`h-5 w-5 ${columnColor ? 'text-white/70 hover:text-white hover:bg-white/15' : ''}`}>
                  <Plus className="h-3 w-3" />
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
        </DialogHeader>

        <Separator />

        {/* Scrollable content with sidebar */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Contact section */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4" />
              Contato
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {editingField === "phone" as any ? (
                  <Input
                    autoFocus
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    onBlur={async () => {
                      if (!deal || editPhone === ((deal as any).phone || "")) { setEditingField(null); return; }
                      const { error } = await supabase.from("deals").update({ phone: editPhone.trim() || null } as any).eq("id", deal.id);
                      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
                      else onUpdated();
                      setEditingField(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingField(null); }}
                    className="h-6 text-xs w-40"
                    placeholder="Telefone"
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => { setEditPhone((deal as any).phone || ""); setEditingField("phone" as any); }}
                  >
                    {(deal as any).phone || <span className="italic">Adicionar telefone</span>}
                  </span>
                )}
                {(deal as any).phone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const p = formatPhoneForWhatsapp((deal as any).phone);
                      window.open(`https://wa.me/${p}`, "_blank");
                    }}
                    title="WhatsApp"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {editingField === "email" as any ? (
                  <Input
                    autoFocus
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    onBlur={async () => {
                      if (!deal || editEmail === ((deal as any).email || "")) { setEditingField(null); return; }
                      const { error } = await supabase.from("deals").update({ email: editEmail.trim() || null } as any).eq("id", deal.id);
                      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
                      else onUpdated();
                      setEditingField(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingField(null); }}
                    className="h-6 text-xs w-48"
                    placeholder="E-mail"
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => { setEditEmail((deal as any).email || ""); setEditingField("email" as any); }}
                  >
                    {(deal as any).email || <span className="italic">Adicionar e-mail</span>}
                  </span>
                )}
              </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-1" />
                {editingField === "state" as any ? (
                  <StateCitySelect
                    state={editState}
                    city={editCity}
                    onStateChange={async (val) => {
                      setEditState(val);
                      setEditCity("");
                      if (!deal) return;
                      const { error } = await supabase.from("deals").update({ state: val || null, city: null } as any).eq("id", deal.id);
                      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
                      else onUpdated();
                    }}
                    onCityChange={async (val) => {
                      setEditCity(val);
                      if (!deal) return;
                      const { error } = await supabase.from("deals").update({ city: val || null } as any).eq("id", deal.id);
                      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
                      else { onUpdated(); setEditingField(null); }
                    }}
                    compact
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => { setEditState((deal as any).state || ""); setEditCity((deal as any).city || ""); setEditingField("state" as any); }}
                  >
                    {[(deal as any).state, (deal as any).city].filter(Boolean).join(" - ") || <span className="italic">Adicionar localização</span>}
                  </span>
                )}
              </div>
            </div>

          {/* Info section */}
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Valor</span>
              </div>
              {editingField === "value" ? (
                <Input
                  type="number"
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveField("value")}
                  onKeyDown={(e) => handleEditKeyDown(e, "value")}
                  className="h-6 w-full text-xs"
                />
              ) : (
                <span
                  className="text-sm font-bold text-foreground cursor-pointer rounded px-0.5 -mx-0.5 hover:bg-accent transition-colors truncate"
                  onClick={(e) => { e.stopPropagation(); startEditing("value"); }}
                >
                  R$ {Number(deal.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Criado em</span>
              </div>
              <span className="text-sm font-bold text-foreground">{format(new Date(deal.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Na etapa</span>
              </div>
              <span className={`text-sm font-bold ${daysInStage > 7 ? "text-destructive" : "text-foreground"}`}>
                {daysInStage === 0 ? `${hoursInStage}h` : `${daysInStage} dias`}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tempo total</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {(() => {
                   const createdAt = new Date(deal.created_at);
                   const now = new Date();
                   const startOfCreated = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
                   const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                   const totalDays = Math.round((startOfNow.getTime() - startOfCreated.getTime()) / 86400000);
                  if (totalDays === 0) {
                     const totalHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
                     return `${totalHours}h`;
                   }
                  if (totalDays === 1) return "1 dia";
                  if (totalDays < 30) return `${totalDays} dias`;
                  const months = Math.floor(totalDays / 30);
                  const remainDays = totalDays % 30;
                  if (months === 1 && remainDays === 0) return "1 mês";
                  if (months === 1) return `1 mês e ${remainDays}d`;
                  if (remainDays === 0) return `${months} meses`;
                  return `${months} meses e ${remainDays}d`;
                })()}
              </span>
            </div>
          </div>

          {/* Acquisition channel */}
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-2.5 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Canal de Aquisição</span>
            <Select
              value={(deal as any).acquisition_channel || "none"}
              onValueChange={async (val) => {
                const newVal = val === "none" ? null : val;
                const { error } = await supabase.from("deals").update({ acquisition_channel: newVal } as any).eq("id", deal.id);
                if (error) {
                  toast({ title: "Erro", description: error.message, variant: "destructive" });
                } else {
                  onUpdated();
                }
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Sem canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem canal</SelectItem>
                {["Google", "Facebook", "Instagram", "Tiktok", "Indicação", "Cliente fidelizado", "Autorizado"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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


          <Separator />

          {/* Attachments section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                Anexos
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadImage(file);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                {uploadingImage ? "Enviando..." : "Anexar imagem"}
              </Button>
              <span className="text-[10px] text-muted-foreground">ou Ctrl+V</span>
            </div>
            {attachments.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {attachments.map((att) => {
                  const publicUrl = supabase.storage.from("deal-attachments").getPublicUrl(att.file_path).data.publicUrl;
                  return (
                    <div key={att.id} className="group/att relative rounded-lg border border-border overflow-hidden bg-muted/30">
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={publicUrl}
                          alt={att.file_name}
                          className="w-full h-20 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      </a>
                      {(currentUserId === att.user_id || role === "admin") && (
                        <button
                          onClick={() => handleDeleteAttachment(att)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

          <Separator />

          {/* History timeline */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum evento registrado.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((event) => {
                  const profile = historyProfiles[event.user_id] || profilesMap[event.user_id];
                  const icon = event.event_type === "column_change" 
                    ? <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                    : <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
                  return (
                    <div key={event.id} className="flex items-start gap-2.5 text-sm">
                      <div className="mt-0.5 shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground/80">{event.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.full_name || "Usuário"} · {format(new Date(event.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

          {/* Tasks sidebar */}
          <div className="w-full md:w-72 md:border-l border-t md:border-t-0 border-border overflow-y-auto bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Tarefas
              </h3>
              <div className="flex items-center gap-1.5 ml-auto">
              <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                  {dealTasks.filter(t => t.completed).length}/{dealTasks.length}
                </span>
                {role === "admin" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={handleReloadTasks}
                    disabled={reloadingTasks}
                    title="Recarregar tarefas automáticas"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${reloadingTasks ? "animate-spin" : ""}`} />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setShowNewTask(!showNewTask)}
                  title="Criar tarefa"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {/* New Task Modal */}
            <Dialog open={showNewTask} onOpenChange={(open) => {
              setShowNewTask(open);
              if (!open) {
                setNewTaskDesc("");
                setNewTaskDeadlineMode("hours");
                setNewTaskDeadlineDays(1);
                setNewTaskDeadlineDate(undefined);
              }
            }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Tarefa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo</Label>
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="personalizada">Personalizada</option>
                      <option value="mensagem">Mensagem</option>
                      <option value="ligacao">Ligação</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Prazo</Label>
                    <div className="flex gap-2 items-center">
                      <select
                        value={newTaskDeadlineMode}
                        onChange={(e) => setNewTaskDeadlineMode(e.target.value as "hours" | "days" | "date")}
                        className="flex h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="hours">Horas</option>
                        <option value="days">Dias</option>
                        <option value="date">Data</option>
                      </select>
                      {newTaskDeadlineMode === "hours" && (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            type="number"
                            min={1}
                            value={newTaskDeadlineHours}
                            onChange={(e) => setNewTaskDeadlineHours(Number(e.target.value) || 1)}
                            className="h-9"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">horas</span>
                        </div>
                      )}
                      {newTaskDeadlineMode === "days" && (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            type="number"
                            min={1}
                            value={newTaskDeadlineDays}
                            onChange={(e) => setNewTaskDeadlineDays(Number(e.target.value) || 1)}
                            className="h-9"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">dias</span>
                        </div>
                      )}
                      {newTaskDeadlineMode === "date" && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 flex-1 justify-start text-left font-normal">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {newTaskDeadlineDate ? format(newTaskDeadlineDate, "dd/MM/yyyy") : "Selecionar data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newTaskDeadlineDate}
                              onSelect={setNewTaskDeadlineDate}
                              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      placeholder="Descrição da tarefa..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateManualTask();
                        }
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => { setShowNewTask(false); setNewTaskDesc(""); setNewTaskDeadlineMode("hours"); setNewTaskDeadlineDays(1); setNewTaskDeadlineDate(undefined); }}>
                    Cancelar
                  </Button>
                  <Button disabled={creatingTask} onClick={handleCreateManualTask}>
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {loadingTasks ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5 animate-pulse">
                    <div className="h-4 w-4 rounded bg-muted mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-muted" />
                      <div className="h-2.5 w-1/2 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dealTasks.length === 0 && !showNewTask ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">Sem tarefas para esta etapa</p>
            ) : (
              <div className="space-y-2">
                {dealTasks.map((task) => {
                  const isOverdue = !task.completed && new Date(task.deadline_at) < new Date();
                  const isCompleting = completingTaskIds.has(task.id);
                  const typeIcon = task.type === "mensagem" ? <MessageSquare className="h-3.5 w-3.5" /> 
                    : task.type === "ligacao" ? <PhoneCall className="h-3.5 w-3.5" />
                    : <ClipboardList className="h-3.5 w-3.5" />;
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-2 rounded-lg border p-2.5 transition-all duration-500 ease-out ${
                        isCompleting ? "opacity-50 scale-95" : task.completed ? "border-border/50 bg-muted/30 opacity-60" : isOverdue ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"
                      }`}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`${task.completed ? "text-muted-foreground/50" : "text-muted-foreground"}`}>{typeIcon}</span>
                          <span className={`text-xs font-medium leading-tight ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.description || (task.type === "mensagem" ? "Enviar mensagem" : task.type === "ligacao" ? "Realizar ligação" : "Tarefa")}
                          </span>
                          {task.template_id && task.next_recurrence_at !== undefined && task.next_recurrence_at !== null && (
                            <Repeat className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className={`text-[10px] ${task.completed ? "text-muted-foreground line-through" : isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                            {format(new Date(task.deadline_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {!task.completed && (task.type === "mensagem" || task.type === "ligacao") && (
                          <div className="mt-1.5">
                            {(deal as any).phone ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] px-2 gap-1"
                                onClick={() => {
                                  const p = formatPhoneForWhatsapp((deal as any).phone);
                                  if (task.type === "mensagem") {
                                    window.open(`https://wa.me/${p}`, "_blank");
                                  } else {
                                    window.open(`tel:+${p}`);
                                  }
                                }}
                              >
                                {task.type === "mensagem" ? (
                                  <><MessageSquare className="h-3 w-3" /> WhatsApp</>
                                ) : (
                                  <><PhoneCall className="h-3 w-3" /> Ligar</>
                                )}
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Adicione um telefone para usar esta ação</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
            {!deal.assigned_to && (
              <Button
                size="sm"
                variant="default"
                className="gap-1 animate-pulse hover:animate-none shadow-md"
                onClick={async () => {
                  if (!deal) return;
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  const { error } = await supabase.from("deals").update({ assigned_to: user.id } as any).eq("id", deal.id);
                  if (error) {
                    toast({ title: "Erro ao capturar", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Negociação capturada!" });
                    const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
                    if (profile) setAssignedProfile(profile);
                    onUpdated();
                  }
                }}
              >
                <User className="h-4 w-4" />
                Capturar
              </Button>
            )}
            {(role === "admin" || (currentUserId && deal.assigned_to === currentUserId)) && (
              <>
                {role === "admin" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if ((deal as any).archived) {
                        const { error } = await (supabase.from("deals") as any).update({ archived: false, archive_reason: null }).eq("id", deal.id);
                        if (error) {
                          toast({ title: "Erro", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "Negociação desarquivada!" });
                          onUpdated();
                          onOpenChange(false);
                        }
                      } else {
                        setArchiveReason("");
                        setShowArchiveReasonDialog(true);
                      }
                    }}
                  >
                    {(deal as any).archived ? (
                      <><ArchiveRestore className="h-4 w-4 mr-1" /> Desarquivar</>
                    ) : (
                      <><Archive className="h-4 w-4 mr-1" /> Arquivar</>
                    )}
                  </Button>
                )}
                {role === "admin" && deal.funnel_id && (
                  <Popover open={delegateOpen} onOpenChange={setDelegateOpen}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <ArrowRightLeft className="h-4 w-4 mr-1" />
                        Delegar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Delegar para:</p>
                      {funnelMembers.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum membro disponível</p>
                      ) : (
                        <div className="space-y-1">
                          {funnelMembers.map((m) => (
                            <button
                              key={m.id}
                              disabled={delegating}
                              onClick={() => handleDelegate(m.id, m.full_name || "Sem nome")}
                              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
                            >
                              {m.full_name || "Sem nome"}
                            </button>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
                {deal.assigned_to && currentUserId && deal.assigned_to === currentUserId && (
                  <Button size="sm" variant="outline" onClick={handleLeaveDeal}>
                    <UserMinus className="h-4 w-4 mr-1" />
                    Sair da negociação
                  </Button>
                )}
                {(role === "admin" || allowedActions.includes("disqualified")) && (role === "admin" || (deal.assigned_to && deal.assigned_to === currentUserId)) && (
                  <Button size="sm" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={handleDisqualify}>
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Desqualificar
                  </Button>
                )}
                {(role === "admin" || allowedActions.includes("lost")) && (
                  <Button size="sm" variant="destructive" onClick={handleMarkAsLost}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Perdida
                  </Button>
                )}
                {(role === "admin" || allowedActions.includes("sold")) && (
                  <Button size="sm" onClick={handleMarkAsSold} className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Vendido
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Loss Reason Dialog */}
    <Dialog open={showLossReasonDialog} onOpenChange={setShowLossReasonDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo da perda</DialogTitle>
        </DialogHeader>
        <RadioGroup value={selectedLossReason} onValueChange={setSelectedLossReason} className="space-y-2">
          {LOSS_REASONS.map((reason) => (
            <div key={reason} className="flex items-center space-x-2">
              <RadioGroupItem value={reason} id={reason} />
              <Label htmlFor={reason} className="cursor-pointer">{reason}</Label>
            </div>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowLossReasonDialog(false)}>Cancelar</Button>
          <Button onClick={confirmMarkAsLost} disabled={!selectedLossReason} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Archive Reason Dialog */}
    <Dialog open={showArchiveReasonDialog} onOpenChange={setShowArchiveReasonDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo do arquivamento</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Descreva o motivo do arquivamento..."
          value={archiveReason}
          onChange={(e) => setArchiveReason(e.target.value)}
          className="min-h-[100px]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowArchiveReasonDialog(false)}>Cancelar</Button>
          <Button
            disabled={!archiveReason.trim()}
            onClick={async () => {
              if (!deal) return;
              const { error } = await (supabase.from("deals") as any).update({ archived: true, archive_reason: archiveReason.trim() }).eq("id", deal.id);
              if (error) {
                toast({ title: "Erro ao arquivar", description: error.message, variant: "destructive" });
              } else {
                toast({ title: "Negociação arquivada!" });
                setShowArchiveReasonDialog(false);
                onUpdated();
                onOpenChange(false);
              }
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Disqualify Reason Dialog */}
    <Dialog open={showDisqualifyDialog} onOpenChange={setShowDisqualifyDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desqualificar negociação</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Descreva o motivo da desqualificação..."
          value={disqualifyReason}
          onChange={(e) => setDisqualifyReason(e.target.value)}
          className="min-h-[100px]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDisqualifyDialog(false)}>Cancelar</Button>
          <Button
            disabled={!disqualifyReason.trim()}
            onClick={confirmDisqualify}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
