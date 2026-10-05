import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, UserPlus, Search, Phone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/contexts/RoleContext";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DealDialog } from "@/components/DealDialog";
import { ContactDialog } from "@/components/ContactDialog";

interface ClientRow { id: string; name: string; phone: string | null; email: string | null; total: number; count: number; lastDealId: string | null }
interface Funnel { id: string; name: string }
interface Column { id: string; funnel_id: string; name: string; column_type: string; position: number }

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function ClientsSidebar() {
  const { state, setOpen } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();

  const [sellerId, setSellerId] = useState<string>("");
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [funnelId, setFunnelId] = useState("");
  const [dealOpen, setDealOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ title?: string; phone?: string; email?: string } | undefined>();

  useEffect(() => { if (user && !sellerId) setSellerId(user.id); }, [user, sellerId]);

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "vendedor");
      const ids = (roles || []).map((r) => r.user_id);
      if (!ids.length) return;
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids).order("full_name");
      setSellers((profs || []).map((p) => ({ id: p.id, name: p.full_name || "Sem nome" })));
    })();
  }, [role]);

  useEffect(() => {
    supabase.from("funnels").select("id, name").order("position").then(({ data }) => {
      setFunnels(data || []);
      if (data?.[0]) setFunnelId((f) => f || data[0].id);
    });
    supabase.from("funnel_columns").select("id, funnel_id, name, column_type, position").order("position").then(({ data }) => {
      setColumns((data as any) || []);
    });
  }, []);

  const load = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    const { data: cl } = await supabase.from("clients").select("id, name, phone, email").eq("user_id", sellerId);
    const list = cl || [];
    const agg = new Map<string, { total: number; count: number; last: string | null; lastAt: string }>();
    const ids = list.map((c) => c.id);
    for (let i = 0; i < ids.length; i += 150) {
      const { data: ds } = await supabase.from("deals").select("id, client_id, value, sold_at, updated_at")
        .eq("status", "Vendido").in("client_id", ids.slice(i, i + 150));
      (ds || []).forEach((d) => {
        const k = d.client_id as string;
        const cur = agg.get(k) || { total: 0, count: 0, last: null, lastAt: "" };
        cur.total += Number(d.value) || 0;
        cur.count += 1;
        const at = d.sold_at || d.updated_at;
        if (at > cur.lastAt) { cur.lastAt = at; cur.last = d.id; }
        agg.set(k, cur);
      });
    }
    setClients(list.map((c) => {
      const a = agg.get(c.id);
      return { ...c, total: a?.total || 0, count: a?.count || 0, lastDealId: a?.last || null };
    }).sort((a, b) => b.total - a.total));
    setLoading(false);
  }, [sellerId]);

  useEffect(() => { if (!collapsed) load(); }, [collapsed, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (qd && (c.phone || "").replace(/\D/g, "").includes(qd)));
  }, [clients, search]);

  const dealStatuses = columns.filter((c) => c.funnel_id === funnelId && c.column_type === "deals").map((c) => c.name);
  const contactColumn = columns.find((c) => c.funnel_id === funnelId && c.column_type === "contacts")
    || columns.find((c) => c.column_type === "contacts");

  const openDeal = (p?: typeof prefill) => { setPrefill(p); setDealOpen(true); };

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Meus clientes"
        className="fixed left-0 top-1/2 z-40 -translate-y-1/2 rounded-r-xl border border-l-0 border-border bg-card/90 py-4 pl-2 pr-3 shadow-lg backdrop-blur-md transition-colors hover:bg-accent"
      >
        <Users className="h-5 w-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <Sidebar collapsible="offcanvas" className="top-0 z-50 h-svh border-r shadow-2xl">
      <SidebarHeader>
          <div className="space-y-2 p-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Clientes</span>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            {role === "admin" && sellers.length > 0 && (
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Vendedor" /></SelectTrigger>
                <SelectContent>
                  {user && <SelectItem value={user.id}>Eu</SelectItem>}
                  {sellers.filter((s) => s.id !== user?.id).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {funnels.length > 1 && (
              <Select value={funnelId} onValueChange={setFunnelId}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Funil" /></SelectTrigger>
                <SelectContent>{funnels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => openDeal()} disabled={!funnelId}><Plus className="h-4 w-4" /> Negociação</Button>
              <Button size="sm" variant="outline" onClick={() => setContactOpen(true)} disabled={!contactColumn}><UserPlus className="h-4 w-4" /> Contato</Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome ou telefone" className="h-9 pl-8" />
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{filtered.length} clientes · por valor vendido</SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2 px-1">
              {loading && <div className="py-6 text-center text-xs text-muted-foreground">Carregando...</div>}
              {!loading && filtered.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">Nenhum cliente</div>}
              {!loading && filtered.map((c, i) => (
                <div key={c.id} className="group rounded-xl border border-border/60 bg-card p-2.5 shadow-sm">
                  <button className="w-full text-left" onClick={() => c.lastDealId && navigate(`/sale/${c.lastDealId}`)}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        {c.phone && <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</div>}
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{c.count} {c.count === 1 ? "venda" : "vendas"}</span>
                      <span className="font-semibold tabular-nums text-success">{fmtBRL(c.total)}</span>
                    </div>
                  </button>
                  <Button size="sm" variant="ghost" className="mt-1 h-7 w-full text-xs" onClick={() => openDeal({ title: c.name, phone: c.phone || "", email: c.email || "" })}>
                    <Plus className="h-3 w-3" /> Nova negociação
                  </Button>
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

      {funnelId && (
        <DealDialog open={dealOpen} onOpenChange={setDealOpen} statuses={dealStatuses} funnelId={funnelId}
          initialValues={prefill} onSaved={() => load()} />
      )}
      {contactColumn && (
        <ContactDialog open={contactOpen} onOpenChange={setContactOpen} funnelId={contactColumn.funnel_id}
          columnId={contactColumn.id} onSaved={() => {}} />
      )}
    </Sidebar>
  );
}
