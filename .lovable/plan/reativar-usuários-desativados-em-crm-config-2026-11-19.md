# Reativar usuários desativados em /crm-config

## O que muda
Na aba Equipe de /crm-config, nova seção **"Usuários desativados"** listando todos que foram desativados (foto, nome, e-mail). Cada um tem o botão **"Reativar"**, que abre uma janela para escolher:
- Papel: Vendedor ou Admin
- Funis aos quais volta a ter acesso

Ao confirmar, a pessoa volta a conseguir entrar no sistema e aparece de novo na lista da equipe, na roleta de leads (se vendedor e membro do funil) e no monitoramento. As negociações antigas que já foram transferidas continuam com quem recebeu.

## Detalhes técnicos
- Nova função de backend `reactivate-user` (somente admin): remove o banimento (`ban_duration: "none"`), insere o papel em `user_roles` e recria `funnel_members` para os funis escolhidos.
- Listagem: perfis sem nenhum registro em `user_roles` (mesmo critério já usado para "desativados com leads pendentes").
- `TeamManager.tsx`: nova seção + diálogo de reativação; recarrega a lista após sucesso.
