import { User, DollarSign, Clock, UserPlus, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;

interface DealTag {
  id: string;
  name: string;
  color: string;
}

interface FunnelColumn {
  id: string;
  funnel_id: string;
  name: string;
  color: string;
  position: number;
}

interface DealsListViewProps {
  deals: Deal[];
  columns: FunnelColumn[];
  dealTagsMap: Record<string, DealTag[]>;
  profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }>;
  onEditDeal: (deal: Deal) => void;
  onCapture: (dealId: string) => void;
}

export function DealsListView({ deals, columns, dealTagsMap, profilesMap, onEditDeal, onCapture }: DealsListViewProps) {
  const columnMap = new Map(columns.map((c) => [c.name, c]));
  
  const sortedDeals = [...deals].sort((a, b) => {
    const posA = columnMap.get(a.status)?.position ?? 999;
    const posB = columnMap.get(b.status)?.position ?? 999;
    if (posA !== posB) return posA - posB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="p-6 h-[calc(100vh-120px)] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-center">Etapa</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Criação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDeals.map((deal) => {
            const col = columnMap.get(deal.status);
            const tags = dealTagsMap[deal.id] || [];
            const profile = deal.assigned_to ? profilesMap[deal.assigned_to] : null;
            const daysInStage = Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24));
            const daysColor = daysInStage <= 3 ? "text-green-600" : daysInStage <= 7 ? "text-yellow-600" : "text-destructive";

            return (
              <TableRow
                key={deal.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onEditDeal(deal)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {deal.title}
                    {deal.heat > 0 && (
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: deal.heat }, (_, i) => (
                          <Flame key={i} className="h-3 w-3 text-orange-500 fill-orange-500" />
                        ))}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {(deal as any).phone ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" />
                      {(deal as any).phone}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className="text-xs"
                    style={col ? { backgroundColor: col.color, color: "#fff", borderColor: col.color } : undefined}
                  >
                    {deal.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {deal.assigned_to && profile ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {profile.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {(profile.full_name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{profile.full_name || "—"}</span>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); onCapture(deal.id); }}
                    >
                      <UserPlus className="h-3 w-3" />
                      Capturar
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {deal.value && deal.value > 0 ? (
                    <span className="flex items-center justify-end gap-0.5 text-primary font-semibold">
                      <DollarSign className="h-3 w-3" />
                      R$ {Number(deal.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`flex items-center justify-center gap-1 text-xs ${daysColor}`}>
                    <Clock className="h-3 w-3" />
                    {daysInStage === 0 ? "Hoje" : `${daysInStage}d`}
                  </span>
                </TableCell>
                <TableCell>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 3).map((tag) => (
                        <Badge key={tag.id} className="text-[10px] px-1.5 py-0" style={{ backgroundColor: tag.color, color: "#fff" }}>
                          {tag.name}
                        </Badge>
                      ))}
                      {tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {format(new Date(deal.created_at), "dd/MM/yy")}
                </TableCell>
              </TableRow>
            );
          })}
          {sortedDeals.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Nenhuma negociação encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
