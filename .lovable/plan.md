

# Atribuição automática (roleta) nos Fluxos de Captação

## Visão geral

Adicionar um campo `assignment_mode` na tabela `lead_flows` com duas opções: "Sem dono" (padrão atual) e "Roleta" (distribui automaticamente entre os membros do funil). A edge function `submit-lead` implementará a lógica de roleta.

## Alterações

### 1. Migração SQL
- Adicionar coluna `assignment_mode` na tabela `lead_flows`:
  ```sql
  ALTER TABLE public.lead_flows ADD COLUMN assignment_mode text NOT NULL DEFAULT 'unassigned';
  ```
  Valores possíveis: `unassigned` (sem dono) e `round_robin` (roleta).

### 2. `src/components/LeadFlowManager.tsx`
- Adicionar estado `assignmentMode` no formulário
- Adicionar selectbox "Atribuição" com opções:
  - `unassigned` → "Sem dono"
  - `round_robin` → "Roleta (distribuição automática)"
- Incluir `assignment_mode` no payload de save
- Exibir o modo de atribuição no card do fluxo
- Carregar o valor ao editar

### 3. `supabase/functions/submit-lead/index.ts`
- Carregar `assignment_mode` junto com os dados do fluxo
- Se `round_robin`:
  - Buscar membros do funil via `funnel_members` (pelo `funnel_id` do fluxo)
  - Contar deals ativos (não arquivados) de cada membro naquele funil
  - Atribuir o `assigned_to` ao membro com menos deals (distribuição equilibrada)
- Se `unassigned`: manter comportamento atual (sem `assigned_to`)

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `assignment_mode` em `lead_flows` |
| `src/components/LeadFlowManager.tsx` | Adicionar selectbox de modo de atribuição |
| `supabase/functions/submit-lead/index.ts` | Implementar lógica de roleta |

