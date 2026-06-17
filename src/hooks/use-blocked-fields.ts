import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the set of field names that are blocked for the given funnel/status
 * (column). Blocked fields must be hidden in the UI; they are also auto-cleared
 * server-side via a trigger.
 */
export function useBlockedFields(funnelId?: string | null, status?: string | null): Set<string> {
  const [blocked, setBlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    if (!funnelId || !status) {
      setBlocked(new Set());
      return;
    }
    (async () => {
      const { data: col } = await supabase
        .from("funnel_columns")
        .select("id")
        .eq("funnel_id", funnelId)
        .eq("name", status)
        .maybeSingle();
      if (!active || !col) {
        setBlocked(new Set());
        return;
      }
      const { data } = await supabase
        .from("column_blocked_fields" as any)
        .select("field_name")
        .eq("column_id", col.id);
      if (!active) return;
      setBlocked(new Set((data || []).map((r: any) => r.field_name)));
    })();
    return () => {
      active = false;
    };
  }, [funnelId, status]);

  return blocked;
}

export const BLOCKABLE_FIELDS = [
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "value", label: "Valor" },
  { value: "state", label: "Estado" },
  { value: "city", label: "Cidade" },
  { value: "acquisition_channel", label: "Canal de aquisição" },
  { value: "notes", label: "Notas" },
  { value: "return_date", label: "Data de retorno" },
  { value: "tags", label: "Tags" },
];
