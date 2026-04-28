
# Delegar leads e desativar usuário

## Objetivo

Em `/crm-config` → Equipe, adicionar uma ação "Desativar e transferir leads" para cada membro. Ao usar:
1. Admin escolhe outro usuário como destino.
2. Todas as negociações (`deals`) do usuário origem passam para o destino.
3. O usuário origem é desativado (não consegue mais logar) e removido das listagens ativas.

## Comportamento

### Novo botão na linha de cada membro (TeamManager)
- Ícone `UserCog` ao lado de Resetar senha / Remover.
- Abre dialog "Transferir leads e desativar":
  - Mostra quantas negociações ativas o usuário possui (consulta rápida em `deals` filtrando `archived=false`).
  - Select com demais membros (exclui o próprio).
  - Checkbox: "Transferir também negociações arquivadas" (default: ligado).
  - Botões: Cancelar / Confirmar.

### Ação ao confirmar
Chama edge function `transfer-and-deactivate` que:
1. Valida admin via `get_my_role`.
2. Atualiza `deals.user_id` (e `assigned_to` quando igual ao origem) → destino. Respeita filtro de arquivado conforme checkbox.
3. Adiciona o destino como `funnel_members` em todos os funis em que o origem era membro (evita perder acesso). Insere com `ON CONFLICT DO NOTHING`.
4. Desativa o usuário em `auth.users` via `adminClient.auth.admin.updateUserById(id, { ban_duration: '876600h' })` (≈100 anos = "indefinido").
5. Remove o `user_roles` do origem (some das listagens de equipe e de vendedores).
6. Remove `funnel_members` do origem.

Histórico: insere uma linha em `deal_history` por deal transferido (`event_type='transferred'`, descrição "Transferido de X para Y") usando `adminClient`.

## Estado atual relevante

- `TeamManager.tsx` lista membros via `user_roles` + `profiles`. Já tem ações: trocar cargo, resetar senha, remover.
- `handleRemoveMember` apenas apaga `user_roles` — leads ficariam órfãos. Manter como está (remoção "limpa" apenas da equipe), e adicionar a nova ação de transferência completa.
- Edge function `invite-user` já é o padrão de operações admin via service role. Criaremos uma nova edge function dedicada.
- RLS permite `UPDATE` em `deals` apenas pelo owner/admin/membro. Service role bypassa — seguro usar na edge function.

## Mudanças

### Nova edge function: `supabase/functions/transfer-and-deactivate/index.ts`
- Body: `{ from_user_id, to_user_id, include_archived: boolean }`.
- Valida admin, valida que `from != to`, valida que ambos existem em `profiles`.
- Executa updates descritos acima usando service role.
- Retorna `{ success, transferred_count }`.

### `src/components/TeamManager.tsx`
- Estado novo: `transferOpen`, `transferMember` (origem), `transferTargetId`, `includeArchived`, `transferring`, `dealCount`.
- Função `openTransfer(member)` → busca `count` de deals do usuário (head request) e abre dialog.
- Função `handleTransfer()` → invoca a edge function, mostra toast com `transferred_count`, chama `fetchTeamMembers()` e fecha dialog.
- Novo botão `UserCog` na linha do membro (apenas se `!isMe`), com tooltip "Transferir leads e desativar".

### `supabase/config.toml`
- Sem mudanças (função usa `verify_jwt = true` padrão; precisa do JWT do admin para validar role).

## Pontos de atenção

- **Banimento via `ban_duration`** é a forma suportada pelo Supabase Auth Admin para "desativar" sem deletar — preserva integridade de FKs históricas (`completed_by`, `updated_by` em `deal_daily_color`, `deal_history.user_id` etc.).
- Não alteramos `deal_history` antigo (mantém o histórico real).
- `funnel_members` do destino: insert com try/catch silencioso por funil (pode já ser membro).
- Confirmação dupla no front antes de chamar a função (ação destrutiva).

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/transfer-and-deactivate/index.ts` | **Novo** — edge function que transfere deals, banja usuário, ajusta funnel_members e user_roles |
| `src/components/TeamManager.tsx` | Adicionar botão `UserCog`, dialog de transferência, lógica de invocação |
