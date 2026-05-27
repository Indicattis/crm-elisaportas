## Objetivo
1. Remover o botão/funcionalidade "Recriar tarefas" da tela `/deal/:id`.
2. Remover o bloqueio que impede marcar como concluída uma tarefa atrasada há mais de 1 dia.

## Mudanças

### 1. Frontend — `src/components/DealDetailView.tsx`
- Remover o botão "Recriar tarefas" e o handler que chama `add_deal_tasks_cycle` (incluindo o toast "Nova etapa criada").
- Manter o restante da UI intacta (lista de tarefas agrupadas por ciclo continua funcionando).

### 2. Banco — migração
- `DROP FUNCTION public.add_deal_tasks_cycle(uuid);` (não é mais chamada).
- Remover o trigger `prevent_late_task_completion` da tabela `deal_tasks` (e dropar a função). Assim, qualquer tarefa atrasada pode ser concluída normalmente.

## Observações
- `recreate_deal_tasks` (usada em mudança de coluna) permanece intacta.
- Triggers `set_green_on_task_completion` e `prevent_task_uncomplete` continuam ativos.
