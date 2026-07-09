import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Phone, MapPin, ShoppingBag, Pencil, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactDialog, type ContactRecord } from "@/components/ContactDialog";
import { CreateDealFromContactDialog } from "@/components/CreateDealFromContactDialog";

interface Props {
  status: string;
  color?: string;
  columnId: string;
  funnelId: string;
  hasDailyColor?: boolean;
  allowedDailyColors?: string[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onChanged?: () => void;
}

const COLOR_HEX: Record<string, string> = { red: "#ef4444", yellow: "#eab308", green: "#22c55e" };
const COLOR_ORDER = ["red", "yellow", "green"] as const;



function darkenHex(hex: string, amount: number): string {
  if (!hex?.startsWith("#") || hex.length !== 7) return hex;
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ContactsColumn({ status, color, columnId, funnelId, hasDailyColor = true, allowedDailyColors, collapsed = false, onToggleCollapse }: Props) {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [stats, setStats] = useState<Record<string, { count: number; total: number }>>({});
  const [colors, setColors] = useState<Record<string, string>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [dealForContact, setDealForContact] = useState<ContactRecord | null>(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const fetchContacts = async () => {
    const { data } = await supabase
      .from("contacts" as any)
      .select("*")
      .eq("column_id", columnId)
      .order("created_at", { ascending: false });
    const list = (data || []) as unknown as ContactRecord[];
    setContacts(list);
    if (list.length) {
      const ids = list.map((c) => c.id);
      const [{ data: deals }, { data: colorRows }] = await Promise.all([
        supabase.from("deals").select("contact_id, value").in("contact_id", ids),
        supabase.from("contact_colors" as any).select("contact_id, color").in("contact_id", ids),
      ]);
      const acc: Record<string, { count: number; total: number }> = {};
      (deals || []).forEach((d: any) => {
        const k = d.contact_id as string;
        if (!acc[k]) acc[k] = { count: 0, total: 0 };
        acc[k].count += 1;
        acc[k].total += Number(d.value) || 0;
      });
      setStats(acc);
      const cmap: Record<string, string> = {};
      (colorRows || []).forEach((r: any) => { cmap[r.contact_id] = r.color; });
      setColors(cmap);
    } else {
      setStats({});
      setColors({});
    }
  };

  useEffect(() => { fetchContacts(); }, [columnId]);

  const allowed = useMemo(
    () => (allowedDailyColors && allowedDailyColors.length > 0
      ? COLOR_ORDER.filter((c) => allowedDailyColors.includes(c))
      : [...COLOR_ORDER]),
    [allowedDailyColors]
  );

  const handleCycleColor = async (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = colors[contactId] || allowed[0];
    const idx = allowed.indexOf(current as any);
    const next = allowed[(idx + 1) % allowed.length];
    setColors((prev) => ({ ...prev, [contactId]: next }));
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from("contact_colors" as any)
      .upsert({ contact_id: contactId, color: next, updated_by: userData.user?.id }, { onConflict: "contact_id" });
  };

  const headerBg = color ? (isDark ? hexToRgba(color, 0.35) : darkenHex(color, 0.25)) : undefined;
  const columnBg = color ? (isDark ? hexToRgba(color, 0.2) : color) : "hsl(var(--muted) / 0.3)";

  const totalOrders = useMemo(() => Object.values(stats).reduce((a, b) => a + b.count, 0), [stats]);


  return (
    <>
      <div
        className="flex flex-shrink-0 flex-col rounded-2xl overflow-hidden h-full transition-all duration-300 ease-in-out"
        style={{
          backgroundColor: columnBg,
          width: collapsed ? 48 : 320,
          minWidth: collapsed ? 48 : 320,
        }}
      >
        <div
          className="flex items-center h-[50px] max-h-[50px] cursor-pointer overflow-hidden"
          style={{ backgroundColor: headerBg }}
          onClick={onToggleCollapse}
        >
          <div
            className="flex flex-col items-center justify-center transition-all duration-300 ease-in-out overflow-hidden"
            style={{
              width: collapsed ? 48 : 0,
              minWidth: collapsed ? 48 : 0,
              opacity: collapsed ? 1 : 0,
            }}
          >
            <ChevronRight className="h-4 w-4 text-white/80 shrink-0" />
          </div>

          <div
            className="flex items-center justify-between flex-1 px-3 transition-all duration-300 ease-in-out"
            style={{
              opacity: collapsed ? 0 : 1,
              pointerEvents: collapsed ? "none" : "auto",
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white/90 shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                title="Total de contatos"
              >
                {contacts.length}
              </span>
              <span className="text-[10px] font-bold text-white/60 ml-1">contatos</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-semibold text-white/85" title="Pedidos gerados">
                {totalOrders} pedidos
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/15"
                onClick={(e) => { e.stopPropagation(); setEditing(null); setDialogOpen(true); }}
                title="Novo contato"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Collapsed body */}
          <div
            className="absolute inset-0 flex flex-col items-center pt-3 transition-opacity duration-300 ease-in-out"
            style={{
              opacity: collapsed ? 1 : 0,
              pointerEvents: collapsed ? "auto" : "none",
            }}
          >
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white/90 shrink-0 mb-2"
              style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
            >
              {contacts.length}
            </span>
            <span
              className="text-xs font-bold text-white"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {status}
            </span>
          </div>

          {/* Expanded body */}
          <div
            className="flex flex-1 flex-col min-h-[100px] overflow-hidden transition-opacity duration-300 ease-in-out"
            style={{
              opacity: collapsed ? 0 : 1,
              pointerEvents: collapsed ? "none" : "auto",
            }}
          >
            <h3
              className="relative z-30 mx-3 mt-3 mb-2 shrink-0 rounded-lg px-3 py-2 text-sm font-bold truncate text-white shadow-sm"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)", backgroundColor: headerBg || columnBg }}
            >
              {status}
            </h3>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 min-h-0">
              {contacts.length === 0 && (
                <p className="text-xs text-white/70 text-center mt-4">Nenhum contato cadastrado.</p>
              )}
              {contacts.map((c) => {

              const s = stats[c.id] || { count: 0, total: 0 };
              return (
                <div key={c.id} className="rounded-lg bg-card/95 backdrop-blur-sm p-3 shadow-sm space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground truncate">{c.name}</h4>
                    <button
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => { setEditing(c); setDialogOpen(true); }}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </div>
                  )}
                  {(c.state || c.city) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {[c.city, c.state].filter(Boolean).join(" / ")}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3" />
                      {s.count} pedido{s.count === 1 ? "" : "s"} · {s.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <Button size="sm" variant="secondary" className="h-6 text-[11px] px-2" onClick={() => setDealForContact(c)}>
                      Criar negociação
                    </Button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>


      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editing}
        funnelId={funnelId}
        columnId={columnId}
        onSaved={fetchContacts}
      />

      {dealForContact && (
        <CreateDealFromContactDialog
          open={!!dealForContact}
          onOpenChange={(o) => { if (!o) setDealForContact(null); }}
          contact={dealForContact}
          onCreated={fetchContacts}
        />
      )}
    </>
  );
}
