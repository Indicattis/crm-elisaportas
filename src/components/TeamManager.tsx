import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, UserPlus, Trash2, Copy, KeyRound, Camera, UserCog } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: string;
}

interface OrphanUser {
  id: string;
  full_name: string | null;
  email: string | null;
  deal_count: number;
}

export function TeamManager() {
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("vendedor");
  const [inviting, setInviting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Transfer & deactivate
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferMember, setTransferMember] = useState<TeamMember | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [dealCount, setDealCount] = useState<number | null>(null);
  const [orphans, setOrphans] = useState<OrphanUser[]>([]);
  const [transferIsOrphan, setTransferIsOrphan] = useState(false);
  const { toast } = useToast();
  const { role } = useUserRole();
  const { user: authUser } = useAuth();
  const isAdmin = role === "admin";

  useEffect(() => {
    fetchCurrentUser();
    if (isAdmin) {
      fetchTeamMembers();
      fetchOrphans();
    }
  }, [isAdmin]);

  const fetchCurrentUser = async () => {
    try {
      if (authUser) setCurrentUserId(authUser.id);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const userIds = (roles || []).map((r: any) => r.user_id);
      if (userIds.length === 0) { setTeamMembers([]); return; }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", userIds)
        .order("full_name");
      if (profilesError) throw profilesError;

      const members: TeamMember[] = (profiles || []).map((p: any) => {
        const userRole = (roles || []).find((r: any) => r.user_id === p.id);
        return { ...p, role: userRole?.role || "vendedor" };
      });
      setTeamMembers(members);
    } catch (err: any) {
      toast({ title: "Erro ao carregar equipe", description: err.message, variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setTempPassword(null);
    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, role: inviteRole, full_name: inviteName },
      });
      if (res.error) throw new Error(res.error.message || "Erro ao convidar");
      const responseData = res.data;
      if (responseData?.error) throw new Error(responseData.error);
      setTempPassword(responseData.temp_password);
      toast({ title: "Usuário convidado com sucesso!" });
      fetchTeamMembers();
    } catch (err: any) {
      toast({ title: "Erro ao convidar", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as "admin" | "vendedor" })
        .eq("user_id", userId);
      if (error) throw error;
      toast({ title: "Cargo atualizado!" });
      fetchTeamMembers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remover este membro da equipe?")) return;
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (error) throw error;
      toast({ title: "Membro removido!" });
      fetchTeamMembers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    if (!confirm(`Resetar a senha de ${member.full_name || "este usuário"}?`)) return;
    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: { action: "reset_password", user_id: member.id, full_name: member.full_name || "usuario" },
      });
      if (res.error) throw new Error(res.error.message || "Erro ao resetar");
      const responseData = res.data;
      if (responseData?.error) throw new Error(responseData.error);
      toast({ title: "Senha resetada!", description: `Nova senha temporária: ${responseData.temp_password}` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleAvatarChange = async (memberId: string, file: File) => {
    setUploadingMemberId(memberId);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${memberId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", memberId);
      if (updateError) throw updateError;
      toast({ title: "Foto atualizada!" });
      fetchTeamMembers();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMemberId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const openTransfer = async (member: TeamMember) => {
    setTransferMember(member);
    setTransferTargetId("");
    setIncludeArchived(true);
    setDealCount(null);
    setTransferOpen(true);
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", member.id);
    setDealCount(count ?? 0);
  };

  const handleTransfer = async () => {
    if (!transferMember || !transferTargetId) return;
    if (!confirm(`Transferir leads de ${transferMember.full_name || "usuário"} e desativar a conta? Esta ação não pode ser desfeita facilmente.`)) return;
    setTransferring(true);
    try {
      const res = await supabase.functions.invoke("transfer-and-deactivate", {
        body: {
          from_user_id: transferMember.id,
          to_user_id: transferTargetId,
          include_archived: includeArchived,
        },
      });
      if (res.error) throw new Error(res.error.message || "Erro");
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Transferência concluída!",
        description: `${data.transferred_count} negociaçõe(s) transferida(s). Usuário desativado.`,
      });
      setTransferOpen(false);
      setTransferMember(null);
      fetchTeamMembers();
    } catch (err: any) {
      toast({ title: "Erro na transferência", description: err.message, variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Equipe</h2>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Membros da Equipe</h3>
            <Button size="sm" onClick={() => { setInviteOpen(true); setTempPassword(null); setInviteEmail(""); setInviteName(""); setInviteRole("vendedor"); }}>
              <UserPlus className="h-4 w-4 mr-1" /> Convidar
            </Button>
          </div>
          <div className="space-y-3">
            {teamMembers.map((member) => {
              const memberInitials = (member.full_name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
              const isMe = member.id === currentUserId;
              return (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="relative group">
                    <Avatar className="h-10 w-10">
                      {member.avatar_url ? <AvatarImage src={member.avatar_url} /> : null}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{memberInitials}</AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRefs.current[member.id]?.click()}
                      disabled={uploadingMemberId === member.id}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {uploadingMemberId === member.id ? (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 text-white" />
                      )}
                    </button>
                    <input
                      ref={(el) => { fileInputRefs.current[member.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarChange(member.id, file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.full_name || "Sem nome"} {isMe && <span className="text-muted-foreground">(você)</span>}
                    </p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    )}
                  </div>
                  <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-xs">
                    {member.role === "admin" ? "Admin" : "Vendedor"}
                  </Badge>
                  {!isMe && (
                    <div className="flex gap-1">
                      <Select value={member.role} onValueChange={(v) => handleChangeRole(member.id, v)}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => handleResetPassword(member)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Resetar senha">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openTransfer(member)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Transferir leads e desativar">
                        <UserCog className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Remover da equipe">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {teamMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
          </DialogHeader>
          {tempPassword ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">Usuário criado com sucesso! Compartilhe as credenciais abaixo:</p>
              <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm"><strong>Email:</strong> {inviteEmail}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(inviteEmail)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm"><strong>Senha temporária:</strong> {tempPassword}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(tempPassword)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">O usuário deve alterar a senha após o primeiro login.</p>
              <DialogFooter>
                <Button onClick={() => setInviteOpen(false)}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                  Convidar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer & Deactivate Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir leads e desativar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Todas as negociações de <strong>{transferMember?.full_name || "este usuário"}</strong> serão atribuídas ao destinatário escolhido. Em seguida, a conta será desativada e não poderá mais acessar o sistema.
            </p>
            <div className="rounded-lg border border-border p-3 bg-muted/40 text-sm">
              {dealCount === null ? (
                <span className="text-muted-foreground">Carregando contagem de negociações…</span>
              ) : (
                <span><strong>{dealCount}</strong> negociação(ões) no total (incluindo arquivadas).</span>
              )}
            </div>
            <div className="space-y-2">
              <Label>Transferir para</Label>
              <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar destinatário" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers
                    .filter((m) => m.id !== transferMember?.id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name || m.email || "Sem nome"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-archived"
                checked={includeArchived}
                onCheckedChange={(v) => setIncludeArchived(!!v)}
              />
              <Label htmlFor="include-archived" className="cursor-pointer text-sm font-normal">
                Transferir também negociações arquivadas
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)} disabled={transferring}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransfer}
              disabled={transferring || !transferTargetId}
            >
              {transferring ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserCog className="h-4 w-4 mr-1" />}
              Transferir e desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
