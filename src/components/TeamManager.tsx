import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, UserPlus, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/contexts/RoleContext";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
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
  const { toast } = useToast();
  const { role } = useUserRole();
  const isAdmin = role === "admin";

  useEffect(() => {
    fetchProfile();
    if (isAdmin) fetchTeamMembers();
  }, [isAdmin]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
      }
    } catch (err: any) {
      toast({ title: "Erro ao carregar perfil", description: err.message, variant: "destructive" });
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
        .select("id, full_name, avatar_url")
        .in("id", userIds);
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

  const handleSaveName = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (error) throw error;
      setProfile({ ...profile, full_name: fullName });
      toast({ title: "Nome atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (updateError) throw updateError;
      setProfile({ ...profile, avatar_url: avatarUrl });
      toast({ title: "Foto atualizada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setTempPassword(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Equipe</h2>
      </div>

      {isAdmin && (
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
                    <Avatar className="h-10 w-10">
                      {member.avatar_url ? <AvatarImage src={member.avatar_url} /> : null}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{memberInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.full_name || "Sem nome"} {isMe && <span className="text-muted-foreground">(você)</span>}
                      </p>
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
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
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
      )}

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
    </div>
  );
}
