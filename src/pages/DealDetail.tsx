import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DealDetailView } from "@/components/DealDetailView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [columnColor, setColumnColor] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadDeal = useCallback(async () => {
    if (!id) return;
    const { data: dealData, error } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !dealData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setDeal(dealData);

    if (dealData.funnel_id) {
      const { data: cols } = await supabase
        .from("funnel_columns")
        .select("name, color")
        .eq("funnel_id", dealData.funnel_id)
        .order("position");
      setStatuses((cols || []).map((c: any) => c.name));
      const current = (cols || []).find((c: any) => c.name === dealData.status);
      setColumnColor(current?.color || "");
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    loadDeal();
  }, [loadDeal]);

  const handleClose = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="max-w-5xl mx-auto w-full flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleClose} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {loading ? (
        <div className="max-w-5xl mx-auto w-full space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : notFound || !deal ? (
        <div className="max-w-5xl mx-auto w-full rounded-lg border bg-background p-8 text-center">
          <p className="text-muted-foreground">Negociação não encontrada ou sem acesso.</p>
        </div>
      ) : (
        <DealDetailView
          deal={deal}
          statuses={statuses}
          columnColor={columnColor}
          onUpdated={loadDeal}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
