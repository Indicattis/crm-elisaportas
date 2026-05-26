## Objetivo
Mudar o comportamento do botão "Recriar tarefas" em `/deal/:id`: em vez de regenerar **todas** as etapas do grupo de tarefas como um novo ciclo, deve criar **apenas uma nova etapa**, espelhando exatamente as tarefas da última etapa existente no deal.

## Comportamento atual
`public.add_deal_tasks_cycle(_deal_id)` calcula `next_cycle = MAX(cycle)+1` e insere **todos** os `task_templates`/`task_group_schedules` do `task_group_id` com `cycle = next_cycle`. Resultado: 3 etapas → vira 6.

## Novo comportamento
A função deve:
1. Encontrar a "última etapa" do deal = o conjunto de tarefas com maior `cycle` e, dentro dele, o maior `stage_id` por `position` em `task_group_stages` (ou `NULL`/"Sem etapa" se for o caso).
2. Copiar **somente** as tarefas dessa última etapa, criando-as como uma nova etapa do mesmo deal:
   - Mesmo `template_id`, `type`, `description`, `stage_id` da origem.
   - `deadline_at = now() + (template.deadline_hours)` quando houver template; quando não houver template (modo `recurring_days`), usar `now() + intervalo equivalente` derivado do schedule original ou simplesmente `now() + 24h` como fallback.
   - `cycle = MAX(cycle)+1` (mantém a separação visual por ciclo na sidebar — cada nova chamada gera mais uma etapa, nomeada "Etapa X (ciclo N)").
   - `completed = false`, `completed_at = NULL`.
3. Se o deal ainda não tem nenhuma tarefa, não fazer nada (botão só aparece quando há tarefas, então é defensivo).

## Mudanças

### 1. Migração: substituir `public.add_deal_tasks_cycle`
- Detectar `v_last_cycle = MAX(cycle)` em `deal_tasks` do deal.
- Detectar `v_last_stage_id`: dentro de `v_last_cycle`, escolher o `stage_id` da última etapa. Critério: maior `position` em `task_group_stages` entre os `stage_id` presentes; se todos forem `NULL`, tratar como "sem etapa".
- Selecionar as tarefas de origem: `deal_tasks WHERE deal_id = _deal_id AND cycle = v_last_cycle AND stage_id IS NOT DISTINCT FROM v_last_stage_id`.
- Para cada uma, inserir nova linha com `cycle = v_last_cycle + 1`, `deadline_at = now() + COALESCE(tt.deadline_hours, 24) hours` (join opcional em `task_templates` via `template_id`), demais campos copiados.
- Manter `SECURITY DEFINER` e `search_path = public`.

### 2. Frontend (`src/components/DealDetailView.tsx`)
- Nenhuma mudança de UI necessária. O label do botão "Recriar tarefas" e o toast continuam válidos (ajustar a mensagem do toast para "Nova etapa criada" para refletir o comportamento).
- A renderização já agrupa por `cycle`, então a nova etapa aparece como "Etapa X (ciclo N)" automaticamente.

## Observações
- `recreate_deal_tasks` (chamada em outros fluxos, ex.: mudança de coluna) **não** é alterada — continua regenerando tudo.
- O badge de progresso por etapas no kanban (`KanbanBoard.tsx`) continua funcionando: a nova etapa entra como um bucket `stage_id::cycle` adicional.
