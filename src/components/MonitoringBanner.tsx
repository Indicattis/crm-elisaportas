import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function MonitoringBanner() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");
      const roleIds = (roles || []).map((r) => r.user_id);
      if (!roleIds.length) {
        if (active) setPending(false);
        return;
      }

      // Only sellers that still have a profile (active users)
      const { data: profs } = await supabase
        .from("profiles")
        .select("id")
        .in("id", roleIds);
      const ids = (profs || []).map((p) => p.id);
      if (!ids.length) {
        if (active) setPending(false);
        return;
      }

      const { data: rows } = await supabase
        .from("crm_monitoring" as any)
        .select("seller_id, completed")
        .eq("date", todayKey());

      const done = new Set(
        (rows || []).filter((r: any) => r.completed).map((r: any) => r.seller_id),
      );
      const allDone = ids.every((id) => done.has(id));
      if (active) setPending(!allDone);
    };

    check();

    const channel = supabase
      .channel("crm_monitoring_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_monitoring" },
        () => check(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => check(),
      )
      .subscribe();

    const interval = window.setInterval(check, 20000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  if (!pending) return null;

  return (
    <button
      onClick={() => navigate("/monitoramento")}
      className="flex w-full items-center justify-center gap-3 bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition-colors hover:bg-orange-600"
    >
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <span>
        Atenção: o monitoramento de hoje ainda não foi preenchido. Marque a conclusão do CRM para todos os vendedores.
      </span>
    </button>
  );
}
