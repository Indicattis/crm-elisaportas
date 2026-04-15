

# Garantir criação automática de tarefas via trigger de banco de dados

## Problema

A criação de tarefas ao criar/mover negociações depende de chamadas client-side espalhadas em 3 componentes (`DealDialog`, `DealDetailDialog`, `KanbanBoard`) e 1 edge function (`submit-lead`). Se qualquer chamada falhar silenciosamente ou um novo ponto de criação/movimentação for adicionado sem incluir a lógica, as tarefas não são criadas.

## Solução

Mover a lógica para um **database trigger** na tabela `deals` que dispara automaticamente quando `status` muda (INSERT ou UPDATE). Isso garante que, independente de como a negociação é criada ou movida, as tarefas sempre serão geradas.

## Alterações

### 1. Criar função e trigger no banco (migration)

Criar uma função PL/pgSQL `handle_deal_tasks_on_status_change()` com `SECURITY DEFINER` que:
- No INSERT: busca `funnel_columns.task_group_id` pela coluna correspondente, busca `task_templates` do grupo, e insere em `deal_tasks`
- No UPDATE (quando `status` muda): deleta tarefas pendentes (`completed = false`) do deal, e cria as novas tarefas da nova coluna
- Calcula `deadline_at` e `next_recurrence_at` usando a mesma lógica que já existe no client

Trigger `AFTER INSERT OR UPDATE OF status ON deals` chamando essa função.

### 2. Remover chamadas client-side redundantes

| Arquivo | O que remover |
|---|---|
| `src/components/DealDialog.tsx` | Remover `createDealTasksForColumn` call após insert |
| `src/components/KanbanBoard.tsx` | Remover `deletePendingDealTasks` e `createDealTasksForColumn` calls em `executeDealMove` |
| `src/components/DealDetailDialog.tsx` | Remover a lógica de "recriar tarefas" automática (manter botão manual se existir, mas ele pode chamar uma RPC dedicada) |
| `supabase/functions/submit-lead/index.ts` | Remover todo o bloco de criação de tasks (linhas ~150-190) |

### 3. Manter botão "Recriar Tarefas" no DealDetailDialog

O botão manual de recriar tarefas continuará funcionando, mas chamará um RPC `recreate_deal_tasks(deal_id)` que faz delete + insert no servidor, garantindo consistência.

## Detalhes técnicos

```text
deals table
  ┌─────────────────────────────┐
  │ AFTER INSERT OR UPDATE(status) │
  │         TRIGGER              │
  └──────────┬──────────────────┘
             │
             ▼
  handle_deal_tasks_on_status_change()
    1. Se UPDATE e OLD.status = NEW.status → sair
    2. Se UPDATE → DELETE deal_tasks WHERE deal_id AND completed=false
    3. Buscar funnel_columns.task_group_id
    4. Buscar task_templates do grupo
    5. INSERT deal_tasks com deadlines calculados
```

A função PL/pgSQL replica a lógica de cálculo de `deadline_at` (now + deadline_hours) e `next_recurrence_at` (interval/weekday/monthday) que já existe em `deal-tasks.ts`.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Nova migration SQL | Criar função + trigger + RPC |
| `src/components/DealDialog.tsx` | Remover import e chamada de `createDealTasksForColumn` |
| `src/components/KanbanBoard.tsx` | Remover imports e chamadas de task functions |
| `src/components/DealDetailDialog.tsx` | Alterar "recriar tarefas" para chamar RPC |
| `supabase/functions/submit-lead/index.ts` | Remover bloco de criação de tasks |
| `src/lib/deal-tasks.ts` | Pode ser removido ou simplificado (manter só o RPC call) |

