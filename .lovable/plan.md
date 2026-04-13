

# Registrar origem da criação no histórico de negociações

## Visão geral

Adicionar um registro automático no `deal_history` sempre que uma negociação for criada, indicando a origem: **criação manual** (pelo Kanban) ou **fluxo de captação** (via edge function `submit-lead`).

## Alterações

### 1. `src/components/DealDialog.tsx`
- Após o `insert` de uma nova negociação (linha ~139-144), adicionar um `insert` em `deal_history` com:
  - `event_type: "creation"`
  - `description: "Negociação criada manualmente"`
  - `user_id: user.id`
  - `deal_id: newDeal.id`

### 2. `supabase/functions/submit-lead/index.ts`
- Após a criação bem-sucedida do deal, adicionar um `insert` em `deal_history` com:
  - `event_type: "creation"`
  - `description: "Negociação criada via fluxo de captação"` (incluindo o nome do fluxo se disponível)
  - `user_id: funnel.user_id` (dono do funil, já que não há usuário autenticado)
  - `deal_id: deal.id`

## Detalhes técnicos

| Item | Detalhe |
|---|---|
| Tabela | `deal_history` (já existente) |
| Novo event_type | `"creation"` |
| Sem migração | Não é necessário alterar schema |

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/DealDialog.tsx` | Inserir histórico após criação manual |
| `supabase/functions/submit-lead/index.ts` | Inserir histórico após criação via fluxo |

