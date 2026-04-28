## Adicionar "Data para retorno" às negociações

Novo campo opcional `return_date` (timestamp com hora) na tabela `deals`. Quando preenchido, **substitui sempre** a data da próxima tarefa exibida no card do Kanban. Edição apenas pelo modal de detalhes.

### Backend

Migração na tabela `deals`:
- Coluna `return_date timestamptz NULL`.

### UI — Modal de detalhes (`DealDetailView.tsx`)

- Novo bloco "Data para retorno" próximo aos campos principais (perto de telefone/email).
- Mostra a data formatada `dd/MM/yy 'às' HH:mm` quando definida; senão "Clique para definir...".
- Ao clicar, abre Popover com Shadcn `Calendar` (modo single) + Input de hora (`type="time"`).
- Botões: "Salvar" (atualiza `return_date`) e "Limpar" (define `null`).
- Salvamento via `supabase.from("deals").update({ return_date }).eq("id", deal.id)`.

### Card do Kanban (`DealCard.tsx` + `KanbanBoard.tsx` + `KanbanColumn.tsx`)

- `KanbanBoard` passa um `returnDateMap` (extraído direto de `deals`) para o `KanbanColumn` → `DealCard`.
- `DealCard` na linha 3 (próxima tarefa):
  - Se `deal.return_date` existir → exibe ela com ícone diferente (ex.: `CalendarClock`) e cor vermelha quando passada, âmbar/normal quando futura, com tooltip "Data para retorno".
  - Caso contrário → mantém comportamento atual (`nextTaskDeadline`).
- Ordenação por "next_task" no Kanban: usar `return_date` quando existir, senão `nextTaskMap[id]`.

### Onde mais aparece

- `DealsListView.tsx`: se houver coluna de próxima tarefa, aplicar mesma substituição (verificar e ajustar).
- Tipos: `Tables<"deals">` é regenerado automaticamente após a migração.

### Fora de escopo

- Notificações/lembretes baseados na data de retorno.
- Edição inline no card.
- Filtros por data de retorno (pode vir depois).