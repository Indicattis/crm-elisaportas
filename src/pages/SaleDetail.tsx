import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarIcon,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  Radio,
  CheckCircle2,
  MessageSquare,
  History,
  Paperclip,
  StickyNote,
  FileText,
  Download,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

interface HistoryEvent {
  id: string;
  deal_id: string;
  user_id: string;
  event_type: string;
  description: string;
  metadata: any;
  created_at: string;
}

interface Comment {
  id: string;
  deal_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Task {
  id: string;
  deal_id: string;
  type: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  deadline_at: string;
  stage_id: string | null;
}

interface Attachment {
  id: string;
  deal_id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [assignedProfile, setAssignedProfile] = useState<Profile | null>(null);
  const [funnelName, setFunnelName] = useState<string>("");
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [savingDate, setSavingDate] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: dealData } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    if (!dealData) {
      setLoading(false);
      setDeal(null);
      return;
    }
    setDeal(dealData as Deal);

    const [
      { data: histData },
      { data: commentsData },
      { data: tasksData },
      { data: attData },
      { data: tagsData },
    ] = await Promise.all([
      supabase.from("deal_history").select("*").eq("deal_id", id).order("created_at", { ascending: true }),
      supabase.from("deal_comments").select("*").eq("deal_id", id).order("created_at", { ascending: true }),
      supabase.from("deal_tasks").select("*").eq("deal_id", id).order("deadline_at", { ascending: true }),
      supabase.from("deal_attachments").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
      supabase.from("deal_tags").select("tags(id, name, color)").eq("deal_id", id),
    ]);

    setHistory((histData as HistoryEvent[]) || []);
    setComments((commentsData as Comment[]) || []);
    setTasks((tasksData as Task[]) || []);
    setAttachments((attData as Attachment[]) || []);
    setTags(((tagsData || []) as any[]).map((r) => r.tags).filter(Boolean));

    // Funnel name
    if ((dealData as any).funnel_id) {
      const { data: f } = await supabase
        .from("funnels")
        .select("name")
        .eq("id", (dealData as any).funnel_id)
        .maybeSingle();
      setFunnelName(f?.name || "");
    }

    // Collect user ids
    const userIds = new Set<string>();
    if ((dealData as any).assigned_to) userIds.add((dealData as any).assigned_to);
    (histData || []).forEach((h: any) => h.user_id && userIds.add(h.user_id));
    (commentsData || []).forEach((c: any) => c.user_id && userIds.add(c.user_id));
    (tasksData || []).forEach((t: any) => t.completed_by && userIds.add(t.completed_by));

    if (userIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", Array.from(userIds));
      const map: Record<string, Profile> = {};
      (profs || []).forEach((p: any) => {
        map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });
      setProfiles(map);
      if ((dealData as any).assigned_to) {
        setAssignedProfile(map[(dealData as any).assigned_to] || null);
      }
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const soldAt = (deal as any)?.sold_at || deal?.updated_at;

  const updateSoldAt = async (nd: Date | undefined) => {
    if (!nd || !deal) return;
    setSavingDate(true);
    const { error } = await supabase
      .from("deals")
      .update({ sold_at: nd.toISOString() } as any)
      .eq("id", deal.id);
    setSavingDate(false);
    if (error) {
      toast({ title: "Erro ao alterar data", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Data de venda atualizada" });
      setDeal((d) => (d ? ({ ...d, sold_at: nd.toISOString() } as any) : d));
    }
  };

  // Merged timeline (history + comments + completed tasks)
  const timeline = useMemo(() => {
    const items: {
      kind: "history" | "comment" | "task";
      at: string;
      userId: string | null;
      title: string;
      body?: string;
      icon: "history" | "comment" | "task";
    }[] = [];

    history.forEach((h) => {
      items.push({
        kind: "history",
        at: h.created_at,
        userId: h.user_id,
        title: h.event_type?.replace(/_/g, " ") || "Evento",
        body: h.description,
        icon: "history",
      });
    });
    comments.forEach((c) => {
      items.push({
        kind: "comment",
        at: c.created_at,
        userId: c.user_id,
        title: "Comentário",
        body: c.content,
        icon: "comment",
      });
    });
    tasks
      .filter((t) => t.completed && t.completed_at)
      .forEach((t) => {
        const label = t.description || (t.type === "mensagem" ? "Mensagem" : t.type === "ligacao" ? "Ligação" : "Tarefa");
        items.push({
          kind: "task",
          at: t.completed_at as string,
          userId: t.completed_by,
          title: `Tarefa concluída: ${label}`,
          icon: "task",
        });
      });

    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [history, comments, tasks]);

  const attachmentUrl = (path: string) =>
    supabase.storage.from("deal-attachments").getPublicUrl(path).data.publicUrl;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-muted/40">
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-muted/40">
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-6 border border-border/60 shadow-sm text-center">
            <p className="text-muted-foreground">Negociação não encontrada.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/vendas")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isSold = deal.status === "Vendido";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/40">
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass rounded-2xl p-4 md:p-5 border border-border/60 shadow-sm flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/vendas")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Vendas
        </Button>
        <div className="rounded-xl p-2.5 bg-success/10 ring-1 ring-success/20">
          <DollarSign className="h-5 w-5 text-success" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold truncate">{deal.title}</h1>
            {isSold && (
              <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/20">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Vendido
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
            {deal.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {deal.phone}
              </span>
            )}
            {assignedProfile?.full_name && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" /> {assignedProfile.full_name}
              </span>
            )}
            {funnelName && (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> {funnelName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Highlight card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 border border-border/60 shadow-sm ring-1 ring-success/15 bg-card/80">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor da venda</div>
          <div className="text-3xl font-bold text-success mt-1 tabular-nums">{fmtBRL(deal.value || 0)}</div>
        </div>
        <div className="glass rounded-2xl p-5 border border-border/60 shadow-sm ring-1 ring-primary/10 bg-card/80">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Data de referência</div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={savingDate}
                className="mt-1 inline-flex items-center gap-2 text-xl font-semibold text-primary hover:underline underline-offset-4"
                title="Clique para alterar a data de referência da venda"
              >
                <CalendarIcon className="h-5 w-5" />
                {format(new Date(soldAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(soldAt)}
                onSelect={updateSoldAt}
                initialFocus
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <div className="text-[11px] text-muted-foreground mt-1">Clique para alterar</div>
        </div>
        <div className="glass rounded-2xl p-5 border border-border/60 shadow-sm bg-card/80 space-y-1.5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Cadastrado em</div>
            <div className="text-sm font-medium">
              {format(new Date(deal.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
          {deal.acquisition_channel && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">Canal</div>
              <div className="text-sm font-medium inline-flex items-center gap-1">
                <Radio className="h-3 w-3" /> {deal.acquisition_channel}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client info */}
      <div className="glass rounded-2xl p-5 border border-border/60 shadow-sm bg-card/80">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Informações do cliente</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Nome" value={deal.title} />
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefone" value={deal.phone || "—"} />
          <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={deal.email || "—"} />
          <InfoRow
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Localização"
            value={[deal.city, deal.state].filter(Boolean).join(" - ") || "—"}
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.map((t) => (
              <Badge
                key={t.id}
                variant="outline"
                className="text-[11px]"
                style={{ borderColor: t.color, color: t.color }}
              >
                {t.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {deal.notes && (
        <div className="glass rounded-2xl p-5 border border-border/60 shadow-sm bg-card/80">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold">Observações</h2>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deal.notes}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="glass rounded-2xl p-5 border border-border/60 shadow-sm bg-card/80">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Histórico de atendimento</h2>
          <Badge variant="secondary" className="ml-auto">{timeline.length}</Badge>
        </div>
        {timeline.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            Nenhum evento registrado.
          </div>
        ) : (
          <ol className="relative border-l border-border/60 pl-5 space-y-4">
            {timeline.map((it, idx) => {
              const author = it.userId ? profiles[it.userId]?.full_name : null;
              const dotClass =
                it.icon === "task"
                  ? "bg-success"
                  : it.icon === "comment"
                    ? "bg-primary"
                    : "bg-muted-foreground";
              const IconCmp =
                it.icon === "task" ? CheckCircle2 : it.icon === "comment" ? MessageSquare : History;
              return (
                <li key={idx} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-background",
                      dotClass,
                    )}
                  >
                    <IconCmp className="h-2.5 w-2.5 text-white" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground capitalize">{it.title}</span>
                    {author && <span>· {author}</span>}
                    <span>· {format(new Date(it.at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                  </div>
                  {it.body && (
                    <div className="text-sm mt-0.5 whitespace-pre-wrap">{it.body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-border/60 shadow-sm bg-card/80">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Anexos</h2>
            <Badge variant="secondary" className="ml-auto">{attachments.length}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {attachments.map((a) => {
              const url = attachmentUrl(a.file_path);
              const isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(a.file_name);
              return (
                <a
                  key={a.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-xl border border-border/60 bg-background/60 overflow-hidden hover:shadow-md transition-all"
                >
                  {isImg ? (
                    <img src={url} alt={a.file_name} className="h-28 w-full object-cover" />
                  ) : (
                    <div className="h-28 w-full flex items-center justify-center bg-muted/40">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Download className="h-3 w-3 shrink-0" />
                    <span className="truncate">{a.file_name}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-background/60 border border-border/60 p-2.5">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
