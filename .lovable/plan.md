

# Data da Proxima Tarefa nos Cards de Negociacao

## Visao geral

Exibir a data/hora da proxima tarefa pendente de cada negociacao no card, acima do valor. Se a tarefa estiver vencida (deadline ultrapassado sem conclusao), o texto fica em vermelho.

## Alteracoes

### 1. KanbanBoard.tsx — Fetch das proximas tarefas

- No fetch de `deal_tasks`, alem dos overdue, buscar a proxima tarefa pendente de cada deal (menor `deadline_at` onde `completed = false`)
- Criar um estado `nextTaskMap: Record<string, string>` mapeando `deal_id` -> `deadline_at` (ISO string)
- Passar esse dado para `KanbanColumn` como prop

### 2. KanbanColumn.tsx — Repassar prop

- Receber `nextTaskMap` e passar `nextTaskDeadline={nextTaskMap[deal.id]}` para cada `DealCard`

### 3. DealCard.tsx — Exibir data da proxima tarefa

- Nova prop `nextTaskDeadline?: string` (ISO date)
- Acima da linha de valor/data de criacao, renderizar a data formatada (dd/MM HH:mm)
- Comparar com `Date.now()`: se vencida, aplicar classe `text-destructive font-medium`; caso contrario, `text-muted-foreground`
- Icone de relogio (Clock) ao lado da data

## Arquivo afetados

| Arquivo | Acao |
|---|---|
| `src/components/KanbanBoard.tsx` | Fetch proxima tarefa por deal, novo estado, passar prop |
| `src/components/KanbanColumn.tsx` | Repassar `nextTaskMap` para DealCard |
| `src/components/DealCard.tsx` | Nova prop e renderizacao da data da proxima tarefa |

