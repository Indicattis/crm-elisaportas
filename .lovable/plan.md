

# Criar Tarefas Automaticamente para Leads via Edge Function

## Problema

A edge function `submit-lead` insere o deal mas não cria as tarefas associadas à coluna de destino. A criação de tarefas (`createDealTasksForColumn`) só acontece no frontend (client-side), então leads vindos da API externa não recebem tarefas.

## Solução

Adicionar lógica de criação de tarefas diretamente na edge function `submit-lead`, após inserir o deal. A lógica replica o que `createDealTasksForColumn` faz no frontend:

1. Buscar a `funnel_column` correspondente ao `funnel_id` + `status` para obter o `task_group_id`
2. Se houver `task_group_id`, buscar os `task_templates` desse grupo
3. Inserir `deal_tasks` para cada template, com deadline e recorrência calculados

## Alteração em `supabase/functions/submit-lead/index.ts`

Após o insert do deal (linha 62), adicionar:

- Query `funnel_columns` filtrando por `funnel_id` e `name = status` para pegar `task_group_id`
- Se existir, query `task_templates` pelo `group_id`, ordenado por `position`
- Para cada template, calcular `deadline_at` e `next_recurrence_at` (mesma lógica de `deal-tasks.ts`)
- Insert batch em `deal_tasks`

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `supabase/functions/submit-lead/index.ts` | Adicionar criação de tarefas após insert do deal |

