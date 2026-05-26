## Objetivo
Adicionar um botão "Recriar tarefas" no final da listagem de tarefas em `/deal/:id` que cria um novo ciclo das mesmas tarefas/etapas sem apagar as existentes. Se o deal tem 3 etapas (ciclo 1), o botão cria a 4ª, 5ª e 6ª etapa (ciclo 2) com a mesma configuração.

## Mudanças

### 1. Banco (migration)
- Adicionar coluna `cycle INTEGER NOT NULL DEFAULT 1` em `public.deal_tasks`.
- Criar índice `(deal_id, cycle)` para a sidebar.
- Criar função `public.add_deal_tasks_cycle(_deal_id uuid)` (SECURITY DEFINER):
  - Descobre o `task_group_id` da coluna atual do deal (via `funnel_columns`).
  - Calcula `next_cycle = COALESCE(MAX(cycle), 1) + 1` em `deal_tasks` para o deal.
  - Reaproveita a lógica de `recreate_deal_tasks` (templates e/ou `task_group_schedules`), mas **sem deletar nada**, e gravando `cycle = next_cycle` nas novas tarefas inseridas. Deadlines contados a partir de `now()`.

### 2. Frontend — `src/components/DealDetailView.tsx`
- Tipo `DealTask`: incluir `cycle: number`.
- `fetchDealTasks`: passar a selecionar `cycle`.
- Handler `handleAddTaskCycle`: chama `supabase.rpc("add_deal_tasks_cycle", { _deal_id: deal.id })`, recarrega `fetchDealTasks` e mostra toast.
- Renderização da lista quando `taskStages.length > 0`:
  - Agrupar por **ciclo** primeiro (ordenado asc), e dentro do ciclo iterar `taskStages` (já ordenadas).
  - Nome exibido: `"<stage.name> (ciclo N)"` quando `cycle > 1`; para `cycle === 1` mantém apenas `stage.name` para não mudar o visual atual.
  - Manter bloco "Sem etapa" como hoje (agrupado também por ciclo).
- Logo abaixo de toda a lista de tarefas (antes do `Separator` do footer), adicionar botão `"Recriar tarefas"` com `variant="outline"`, ícone `RotateCw` e estado de loading. Só aparece se já existir pelo menos uma tarefa e se a coluna tiver `task_group_id` configurado.

## Detalhes técnicos
- Tasks novas usam mesmos `stage_id`/`template_id` das originais — a separação visual é apenas pelo campo `cycle`.
- `handle_deal_tasks_on_status_change` continua deletando tarefas pendentes ao trocar de status; o novo ciclo só é criado por ação manual.
- RLS de `deal_tasks` já cobre admin + dono + membro do funil; a função roda como SECURITY DEFINER seguindo o padrão de `recreate_deal_tasks`.
- Sem mudanças no kanban (o badge de progresso `completed/total` continua somando todos os ciclos, o que é o comportamento desejado).