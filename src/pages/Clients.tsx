import { useState, useEffect, useCallback } from "react";
import { externalSupabase, type ExternalClient } from "@/integrations/external-supabase";
import { Header } from "@/components/Header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const [clients, setClients] = useState<ExternalClient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await externalSupabase
      .from("clientes")
      .select("*")
      .eq("ativo", true)
      .order("nome");
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setClients((data as ExternalClient[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <span className="text-sm text-muted-foreground">{clients.length} cliente(s)</span>
        </div>

        <div className="glass-strong rounded-2xl overflow-hidden">
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
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
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
                        {client.fidelizado && (
                          <Badge variant="default" className="text-xs">Fidelizado</Badge>
                        )}
                        {client.parceiro && (
                          <Badge variant="secondary" className="text-xs">Parceiro</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
