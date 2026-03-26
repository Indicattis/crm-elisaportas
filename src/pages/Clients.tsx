import { useState, useEffect, useCallback, useRef } from "react";
import { externalSupabase, type ExternalClient } from "@/integrations/external-supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ExternalClientDialog } from "@/components/ExternalClientDialog";

const PAGE_SIZE = 25;

export default function Clients() {
  const [clients, setClients] = useState<ExternalClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    let query = externalSupabase
      .from("clientes")
      .select("*", { count: "exact", head: false })
      .eq("ativo", true)
      .order("nome")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (debouncedSearch.trim()) {
      const term = `%${debouncedSearch.trim()}%`;
      query = query.or(`nome.ilike.${term},telefone.ilike.${term}`);
    }

    const { data, error, count } = await query;
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setClients((data as ExternalClient[]) || []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [toast, debouncedSearch, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Clientes</h1>
          <span className="text-xs md:text-sm text-muted-foreground">{totalCount} cliente(s)</span>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="pl-9"
        />
      </div>

      {/* Mobile: cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-strong rounded-xl p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))
        ) : clients.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="glass-strong rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground">{client.nome}</span>
                <div className="flex gap-1">
                  {client.fidelizado && <Badge variant="default" className="text-[10px] px-1.5 py-0">Fidelizado</Badge>}
                  {client.parceiro && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Parceiro</Badge>}
                </div>
              </div>
              {client.telefone && <p className="text-xs text-muted-foreground">{client.telefone}</p>}
              {client.email && <p className="text-xs text-muted-foreground truncate">{client.email}</p>}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {(client.cidade || client.estado) && (
                  <span>
                    {client.cidade && client.estado
                      ? `${client.cidade}/${client.estado}`
                      : client.cidade || client.estado}
                  </span>
                )}
                {client.tipo_cliente && <span>• {client.tipo_cliente}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block glass-strong rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.nome}</TableCell>
                  <TableCell>{client.email || "—"}</TableCell>
                  <TableCell>{client.telefone || "—"}</TableCell>
                  <TableCell>{client.cpf_cnpj || "—"}</TableCell>
                  <TableCell>
                    {client.cidade && client.estado
                      ? `${client.cidade}/${client.estado}`
                      : client.cidade || client.estado || "—"}
                  </TableCell>
                  <TableCell>{client.tipo_cliente || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {client.fidelizado && <Badge variant="default" className="text-xs">Fidelizado</Badge>}
                      {client.parceiro && <Badge variant="secondary" className="text-xs">Parceiro</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs md:text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <span className="hidden sm:inline mr-1">Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ExternalClientDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={fetchClients} />
    </div>
  );
}
