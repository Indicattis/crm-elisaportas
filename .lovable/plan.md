## Objetivo

Adicionar, ao lado do botão "Notas", um botão "Minhas tarefas" que abre um modal com duas tarefas recorrentes por vendedor — uma semanal e uma mensal — com histórico de conclusões.

Tarefas fixas:
- **Semanal:** "Chamar Autorizados e Serralheiros" (renova toda segunda)
- **Mensal:** "Chamar Parceiros" (renova todo dia 1)

## Banco

Nova tabela `public.recurring_task_completions`:

- `id` uuid PK
- `user_id` uuid (vendedor que concluiu)
- `task_key` text — `'weekly_authorized'` ou `'monthly_partners'`
- `period_start` date — segunda-feira da semana (semanal) ou primeiro dia do mês (mensal)
- `completed_at` timestamptz default `now()`
- UNIQUE (`user_id`, `task_key`, `period_start`)

GRANTs: `SELECT, INSERT, DELETE` para `authenticated`; `ALL` para `service_role`. RLS habilitada.

Políticas:
- SELECT: usuário vê suas próprias; admin vê todas (`has_role(auth.uid(),'admin')`)
- INSERT: `auth.uid() = user_id` (cada vendedor marca a própria)
- DELETE: dono da linha ou admin (permite desmarcar do período atual)

Como o registro é a própria evidência de conclusão, o "histórico" é só a leitura ordenada dessa tabela.

## Frontend

### Novo componente `src/components/RecurringTasksDialog.tsx`
- Dialog acionado por botão `variant="outline" size="sm"` com ícone `ListChecks` (lucide) e texto "Minhas tarefas".
- Calcula `currentWeekStart` (segunda da semana, `date-fns/startOfWeek` `weekStartsOn:1`) e `currentMonthStart` (`startOfMonth`).
- Consulta `recurring_task_completions`:
  - Para o **vendedor**: filtra `user_id = auth.uid()`, busca os 2 registros do período atual para determinar checkboxes.
  - Para o **admin**: busca todos os registros do período atual e mostra matriz "vendedor × tarefa" (lista de `profiles` do banco). Admin não marca pelos outros — apenas vê o status.
- Seção "Tarefas atuais":
  - Vendedor: 2 cards/checkboxes ("Semanal — Chamar Autorizados e Serralheiros" e "Mensal — Chamar Parceiros"). Clicar marca/desmarca o registro do período atual.
  - Admin: lista de vendedores com 2 indicadores (concluída/pendente) cada, mostrando data de conclusão quando houver.
- Seção "Histórico" (abaixo, scroll):
  - Vendedor: últimas 30 conclusões próprias (data, tipo, período).
  - Admin: últimas 50 conclusões de qualquer vendedor (data, vendedor, tipo, período).

### `src/components/KanbanBoard.tsx`
- Importar `RecurringTasksDialog` e renderizá-lo logo após `<SharedNotesDialog />` na barra de filtros.

Nenhuma outra parte da app é alterada.

## Notas técnicas

- Não há job — a "renovação" é implícita: ao mudar de período (`period_start`), o registro do período atual deixa de existir e o checkbox volta a aparecer desmarcado.
- Papel lido via `useUserRole()` já existente; `auth.uid()` obtido por `supabase.auth.getUser()`.
- Sem mudança de schema fora dessa tabela.
