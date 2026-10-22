import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Contact as ContactIcon, Search, Plus, Download, ChevronLeft, ChevronRight, Pencil, Briefcase } from "lucide-react";
import { ContactDialog, type ContactRecord } from "@/components/ContactDialog";
import { CreateDealFromContactDialog } from "@/components/CreateDealFromContactDialog";
import { useUserRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

const PAGE = 50;
interface List { id: string; name: string; color: string }
interface Profile { id: string; full_name: string | null; avatar_url: string | null }

export default function Contacts() {
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [listId, setListId] = useState<string>("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<ContactRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [seller, setSeller] = useState("all");
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dealFor, setDealFor] = useState<ContactRecord | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from("contact_lists" as any).select("id, name, color").order("position"),
        supabase.from("profiles").select("id, full_name, avatar_url"),
      ]);
      const ls = ((l as any) || []) as List[];
      setLists(ls);
      if (ls[0]) setListId((cur) => cur || ls[0].id);
      const m: Record<string, Profile> = {};
      (p || []).forEach((x: any) => { m[x.id] = x; });
      setProfiles(m);
    })();
  }, []);

  useEffect(() => {
    if (!lists.length) return;
    Promise.all(lists.map((l) =>
      supabase.from("contacts" as any).select("id", { count: "exact", head: true }).eq("list_id", l.id)
    )).then((res) => {
      const c: Record<string, number> = {};
      res.forEach((r, i) => { c[lists[i].id] = r.count || 0; });
      setCounts(c);
    });
  }, [lists, reload]);

  const buildQuery = useCallback((select: string, opts?: any) => {
    let q: any = supabase.from("contacts" as any).select(select, opts).eq("list_id", listId);
    const s = search.trim().replace(/[,()]/g, " ");
    if (s) {
      const d = s.replace(/\D/g, "");
      const parts = [`name.ilike.%${s}%`, `city.ilike.%${s}%`];
      if (d.length >= 3) parts.push(`phone.ilike.%${d.slice(0, 2)}%${d.slice(2)}%`);
      q = q.or(parts.join(","));
    }
    if (stateFilter !== "all") q = q.eq("state", stateFilter);
    if (seller !== "all") q = q.eq("user_id", seller);
    return q;
  }, [listId, search, stateFilter, seller]);

  useEffect(() => { setPage(0); }, [listId, search, stateFilter, seller]);

  useEffect(() => {
    if (!listId) return;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data, count, error } = await buildQuery("*", { count: "exact" })
        .order("name").range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      setRows((data as any) || []);
      setTotal(count || 0);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [buildQuery, page, reload, listId, toast]);

  const moveTo = async (c: ContactRecord, target: string) => {
    const { error } = await supabase.from("contacts" as any).update({ list_id: target }).eq("id", c.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Contato movido" });
    setReload((r) => r + 1);
  };

  const exportPhones = async () => {
    const all: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await buildQuery("phone").order("name").range(from, from + 999);
      const d = (data as any[]) || [];
      d.forEach((r) => r.phone && all.push(r.phone));
      if (d.length < 1000) break;
    }
    const blob = new Blob([all.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `contatos-telefones-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  const sellerOptions = Object.values(profiles).filter((p) => p.full_name);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/40">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="glass rounded-2xl p-5 flex items-center justify-between gap-3 border border-border/60">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><ContactIcon className="h-5 w-5" /></span>
            <div>
              <h1 className="text-xl font-semibold">Contatos</h1>
              <p className="text-sm text-muted-foreground">{total} contato(s) na lista selecionada</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPhones} className="gap-2"><Download className="h-4 w-4" /> Exportar telefones</Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2" disabled={!listId}><Plus className="h-4 w-4" /> Novo contato</Button>
          </div>
        </div>

        <Tabs value={listId} onValueChange={setListId}>
          <TabsList>
            {lists.map((l) => (
              <TabsTrigger key={l.id} value={l.id} className="gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name} <span className="text-muted-foreground">({counts[l.id] ?? "…"})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="glass rounded-2xl p-4 border border-border/60 grid gap-3 md:grid-cols-[1fr_180px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou cidade" className="pl-9 bg-background/60" />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="bg-background/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={seller} onValueChange={setSeller}>
              <SelectTrigger className="bg-background/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {sellerOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="glass rounded-2xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium">Telefone</th>
                  <th className="p-3 font-medium">Localização</th>
                  <th className="p-3 font-medium">Observações</th>
                  <th className="p-3 font-medium">Responsável</th>
                  <th className="p-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
                )) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum contato encontrado</td></tr>
                ) : rows.map((c) => {
                  const p = profiles[c.user_id];
                  const initials = (p?.full_name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <tr key={c.id} className="border-t border-border/40 hover:bg-muted/30">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 whitespace-nowrap">{c.phone || "-"}</td>
                      <td className="p-3 whitespace-nowrap">{[c.city, c.state].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="p-3 max-w-xs truncate text-muted-foreground" title={c.notes || ""}>{c.notes || "-"}</td>
                      <td className="p-3">
                        <Avatar className="h-7 w-7" title={p?.full_name || ""}>
                          <AvatarImage src={p?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          {lists.length > 1 && (
                            <Select value="" onValueChange={(v) => moveTo(c, v)}>
                              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Mover para" /></SelectTrigger>
                              <SelectContent>
                                {lists.filter((l) => l.id !== listId).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Criar negociação" onClick={() => setDealFor(c)}><Briefcase className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => { setEditing(c); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 border-t border-border/40 text-sm">
            <span className="text-muted-foreground">Página {page + 1} de {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      <ContactDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editing}
        listId={editing ? undefined : listId} onSaved={() => setReload((r) => r + 1)} />
      {dealFor && (
        <CreateDealFromContactDialog contact={dealFor as any} open={!!dealFor}
          onOpenChange={(o: boolean) => !o && setDealFor(null)} onCreated={() => setDealFor(null)} />
      )}
    </div>
  );
}
