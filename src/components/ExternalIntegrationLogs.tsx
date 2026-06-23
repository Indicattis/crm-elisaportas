import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/contexts/RoleContext";

interface IntegrationLog {
  id: string;
  source: string;
  status: string;
  http_status: number;
  title: string | null;
  phone: string | null;
  deal_id: string | null;
  assigned_to: string | null;
  warning: string | null;
  error_message: string | null;
  ip: string | null;
  user_agent: string | null;
  raw_body: unknown;
  created_at: string;
}

interface ProfileMap {
  [id: string]: string;
}

function statusBadge(status: string, httpStatus: number) {
  if (status === "success") {
    return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/30">Sucesso · {httpStatus}</Badge>;
  }
  if (status === "duplicate") {
    return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 border-amber-500/30">Duplicado · {httpStatus}</Badge>;
  }
  return <Badge variant="destructive">Erro · {httpStatus}</Badge>;
}

export function ExternalIntegrationLogs() {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();
  const { role } = useRole();
  const isAdmin = role === "admin";

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("external_integration_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: "Erro ao carregar logs", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = (data as IntegrationLog[]) || [];
    setLogs(rows);

    const ids = Array.from(new Set(rows.map(r => r.assigned_to).filter(Boolean))) as string[];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: ProfileMap = {};
      (profs || []).forEach((p: { id: string; full_name: string | null }) => {
        if (p.full_name) map[p.id] = p.full_name;
      });
      setProfiles(map);
    } else {
      setProfiles({});
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin, fetchLogs]);

  const handleClear = async () => {
    if (!confirm("Apagar todos os registros de log? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase
      .from("external_integration_logs")
      .delete()
      .not("id", "is", null);
    if (error) {
      toast({ title: "Erro ao limpar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Logs apagados" });
    fetchLogs();
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Log de tentativas — Integração externa</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            {logs.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleClear}>
                <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tentativa registrada ainda. Quando o parceiro chamar o endpoint, os eventos aparecerão aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => {
              const isOpen = expanded === log.id;
              const assignedName = log.assigned_to ? profiles[log.assigned_to] || "—" : "—";
              return (
                <li
                  key={log.id}
                  className="rounded-md border border-border bg-card/50 p-3 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    {statusBadge(log.status, log.http_status)}
                    <span className="font-medium text-foreground truncate">
                      {log.title || <span className="text-muted-foreground italic">sem título</span>}
                    </span>
                    <span className="text-muted-foreground text-xs ml-auto whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-3 grid gap-1.5 pl-7 text-xs">
                      <div><span className="text-muted-foreground">Telefone: </span><span className="text-foreground">{log.phone || "—"}</span></div>
                      <div><span className="text-muted-foreground">Atribuído a: </span><span className="text-foreground">{assignedName}</span></div>
                      {log.deal_id && (
                        <div><span className="text-muted-foreground">Deal ID: </span><span className="text-foreground font-mono">{log.deal_id}</span></div>
                      )}
                      {log.warning && (
                        <div className="text-amber-600"><span className="text-muted-foreground">Aviso: </span>{log.warning}</div>
                      )}
                      {log.error_message && (
                        <div className="text-destructive"><span className="text-muted-foreground">Erro: </span>{log.error_message}</div>
                      )}
                      <div><span className="text-muted-foreground">IP: </span><span className="text-foreground">{log.ip || "—"}</span></div>
                      {log.user_agent && (
                        <div className="truncate"><span className="text-muted-foreground">User-Agent: </span><span className="text-foreground">{log.user_agent}</span></div>
                      )}
                      {log.raw_body !== null && log.raw_body !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Body recebido: </span>
                          <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">
                            {JSON.stringify(log.raw_body, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
