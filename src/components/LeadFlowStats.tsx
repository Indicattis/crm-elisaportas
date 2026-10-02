import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  flowId: string;
  funnelId: string;
}

interface Row {
  deal_id: string;
  created_at: string;
  title: string;
  status: string;
  value: number;
  archived: boolean;
  assigned: string;
}

export function LeadFlowStats({ flowId, funnelId }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    (async () => {
      const logs: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase
          .from("external_integration_logs")
          .select("deal_id, created_at, raw_body")
          .eq("source", "lead_flow")
          .not("deal_id", "is", null)
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (!data?.length) break;
        logs.push(...data);
        if (data.length < 1000) break;
      }
      const mine = logs.filter((l) => {
        const b = l.raw_body || {};
        return b.flow_id ? b.flow_id === flowId : b.funnel_id === funnelId;
      });
      const ids = mine.map((l) => l.deal_id);
      const deals: any[] = [];
      for (let i = 0; i < ids.length; i += 150) {
        const { data } = await supabase
          .from("deals")
          .select("id, title, status, value, archived, assigned_to")
          .in("id", ids.slice(i, i + 150));
        if (data) deals.push(...data);
      }
      const userIds = [...new Set(deals.map((d) => d.assigned_to).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] as any[] };
      const pName = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
      const dMap = new Map(deals.map((d) => [d.id, d]));
      setRows(
        mine
          .filter((l) => dMap.has(l.deal_id))
          .map((l) => {
            const d = dMap.get(l.deal_id);
            return {
              deal_id: d.id,
              created_at: l.created_at,
              title: d.title,
              status: d.status,
              value: Number(d.value) || 0,
              archived: d.archived,
              assigned: d.assigned_to ? pName.get(d.assigned_to) || "—" : "Sem dono",
            };
          })
      );
    })();
  }, [flowId, funnelId]);

  if (!rows) return <p className="text-muted-foreground">Carregando histórico…</p>;

  const isSold = (s: string) => /vendid/i.test(s);
  const isLost = (s: string) => /perdid/i.test(s);
  const total = rows.length;
  const sold = rows.filter((r) => isSold(r.status));
  const lost = rows.filter((r) => isLost(r.status));
  const open = total - sold.length - lost.length;
  const soldValue = sold.reduce((a, r) => a + r.value, 0);
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const stats = [
    { label: "Recebidos", value: String(total), cls: "text-primary" },
    { label: "Em andamento", value: `${open} · ${pct(open)}`, cls: "text-foreground" },
    { label: "Vendidos", value: `${sold.length} · ${pct(sold.length)}`, cls: "text-green-600 dark:text-green-400" },
    { label: "Perdidos", value: `${lost.length} · ${pct(lost.length)}`, cls: "text-destructive" },
    { label: "Valor vendido", value: brl(soldValue), cls: "text-green-600 dark:text-green-400" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-muted/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">{s.label}</div>
            <div className={`text-sm font-semibold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowList(!showList)}
        className="flex items-center gap-1 font-medium text-foreground"
      >
        {showList ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Histórico de recebimentos ({total})
      </button>
      {showList && (
        <ul className="max-h-80 overflow-y-auto divide-y divide-border rounded-md border border-border">
          {rows.map((r) => (
            <li key={r.deal_id + r.created_at}>
              <Link
                to={isSold(r.status) ? `/sale/${r.deal_id}` : `/deal/${r.deal_id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 p-2 hover:bg-muted/50"
              >
                <span className="text-muted-foreground w-28 shrink-0">
                  {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span className="font-medium text-foreground truncate flex-1 min-w-[120px]">{r.title}</span>
                <span className="text-muted-foreground">{r.assigned}</span>
                <span
                  className={`rounded px-1.5 py-0.5 ${
                    isSold(r.status)
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : isLost(r.status)
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {r.status}{r.archived ? " (arquivada)" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
