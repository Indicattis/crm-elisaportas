## Objetivo
Quando um card muda de coluna, as tarefas antigas devem ser **totalmente removidas** (pendentes + concluídas). Se a nova coluna tiver `task_group_id`, as tarefas do novo grupo são criadas; se não tiver, o card fica sem tarefas.

Também limpar o estado atual do banco para refletir essa regra.

## Mudanças

### 1. Migração no banco
- Atualizar a função `handle_deal_tasks_on_status_change` (trigger em `deals`) para:
  - Deletar **todas** as `deal_tasks` do deal ao mudar de coluna (remover o filtro `completed = false`).
  - Fluxo restante inalterado: se nova coluna tem `task_group_id`, cria as tarefas do grupo; se não, encerra.
- Atualizar `recreate_deal_tasks(_deal_id)` da mesma forma (deletar tudo antes de recriar), para manter consistência com o botão "Recarregar tarefas automáticas".
- Limpeza pontual: deletar todas as `deal_tasks` de deals cuja coluna atual (`funnel_columns.name = deals.status` e mesmo funil) tenha `task_group_id IS NULL` ou não exista.
- Para deals cuja coluna atual tem `task_group_id`, mas cujas tarefas pertencem a um template de outro grupo (mismatch causado por movimentações antigas antes desta regra): deletar essas tarefas "órfãs" e recriar via `recreate_deal_tasks` para cada deal afetado.

### 2. Frontend
- Nenhuma alteração de UI necessária. `KanbanBoard` já recarrega tarefas ao mover cards; apenas o comportamento no banco muda.

## Observações
- Tarefas concluídas serão perdidas (inclusive histórico visual de progresso). É o comportamento pedido.
- Não afeta colunas do tipo `contacts` (não têm deals).
