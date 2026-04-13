

# Otimização de performance: eliminar chamadas repetidas ao `getUser()`

## Problema

A lentidão é causada por **chamadas excessivas e repetidas a `supabase.auth.getUser()`**. Cada chamada faz uma requisição HTTP ao servidor de autenticação. O código atual chama `getUser()` em praticamente toda ação (toggle de task, envio de comentário, delegação, criação de deal, etc.) -- nos logs de rede, foram registradas **15+ chamadas idênticas em poucos segundos**.

## Solução

Criar um **AuthContext** que armazena o usuário em cache na memória após o login e o disponibiliza via hook `useAuth()`. Todas as chamadas espalhadas a `supabase.auth.getUser()` serão substituídas por `useAuth()` (em componentes) ou receberão o `userId` como parâmetro (em funções utilitárias).

## Alterações

### 1. Criar `src/contexts/AuthContext.tsx`
- Context que escuta `onAuthStateChange` e expõe `{ user, session, loading }`
- O `user` vem da session já existente, sem requisição extra
- Substituir o state de session no `AuthGuard` por este context

### 2. Atualizar `src/components/AuthGuard.tsx`
- Usar o `AuthProvider` wrapping a árvore de componentes (junto com o `RoleProvider` existente)

### 3. Substituir `supabase.auth.getUser()` em todos os componentes
Arquivos afetados (16 arquivos, ~30+ ocorrências):
- `DealDetailDialog.tsx` (9 chamadas)
- `DealDialog.tsx` (2 chamadas)
- `KanbanBoard.tsx`
- `FunnelColumnList.tsx`
- `ClientDialog.tsx`
- `EntryRequirementsModal.tsx`
- `AcquisitionChannelManager.tsx`
- `LeadFlowManager.tsx`
- `FunnelDialog.tsx`
- `Dashboard.tsx`
- `Profile.tsx`
- `lib/notifications.ts` (receber userId como param)
- E outros

Cada chamada será substituída por:
- Em componentes React: `const { user } = useAuth()`
- Em funções utilitárias: receber `userId` como argumento

### 4. Edge functions (sem alteração)
As edge functions (`submit-lead`, etc.) rodam no servidor e usam `service_role_key`, não são afetadas.

## Impacto esperado

- Redução de ~90% das requisições de rede ao endpoint `/auth/v1/user`
- Resposta instantânea em cada ação do usuário
- Sem mudança de comportamento funcional

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/contexts/AuthContext.tsx` | Criar (novo) |
| `src/components/AuthGuard.tsx` | Integrar AuthProvider |
| `src/components/DealDetailDialog.tsx` | Substituir ~9 chamadas getUser |
| `src/components/DealDialog.tsx` | Substituir ~2 chamadas getUser |
| `src/components/KanbanBoard.tsx` | Substituir chamadas getUser |
| + ~12 outros arquivos | Mesma substituição |

