import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface FunnelMembersManagerProps {
  funnelId: string;
}

interface MemberProfile {
  membership_id: string;
  user_id: string;
  full_name: string | null;
}

interface AvailableUser {
  id: string;
  full_name: string | null;
}

export function FunnelMembersManager({ funnelId }: FunnelMembersManagerProps) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("funnel_members")
      .select("id, user_id")
      .eq("funnel_id", funnelId);

    if (error) {
      console.error("Error fetching members:", error);
      return;
    }

    if (!data || data.length === 0) {
      setMembers([]);
      return;
    }

    // Fetch profiles for member user_ids
    const userIds = data.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

    setMembers(
      data.map((m) => ({
        membership_id: m.id,
        user_id: m.user_id,
        full_name: profileMap.get(m.user_id) || "Sem nome",
      }))
    );
  }, [funnelId]);

  const fetchAvailableUsers = useCallback(async () => {
    // Get vendedores
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "vendedor");

    if (!roles || roles.length === 0) {
      setAvailableUsers([]);
      return;
    }

    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    setAvailableUsers(
      (profiles || []).map((p) => ({ id: p.id, full_name: p.full_name }))
    );
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchAvailableUsers();
  }, [fetchMembers, fetchAvailableUsers]);

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    const { error } = await supabase
      .from("funnel_members")
      .insert({ funnel_id: funnelId, user_id: selectedUserId });

    if (error) {
      toast({
        title: "Erro ao adicionar membro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Membro adicionado!" });
      setSelectedUserId("");
      fetchMembers();
    }
    setLoading(false);
  };

  const handleRemove = async (membershipId: string) => {
    const { error } = await supabase
      .from("funnel_members")
      .delete()
      .eq("id", membershipId);

    if (error) {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Membro removido!" });
      fetchMembers();
    }
  };

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const filteredUsers = availableUsers.filter((u) => !memberUserIds.has(u.id));

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-semibold text-foreground">
        Vendedores vinculados
      </h3>

      {members.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum vendedor vinculado a este funil.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <Badge
            key={m.membership_id}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            {m.full_name}
            <button
              onClick={() => handleRemove(m.membership_id)}
              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {filteredUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecionar vendedor" />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || "Sem nome"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={!selectedUserId || loading}>
            <UserPlus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}
