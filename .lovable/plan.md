

# Histórico de Movimentações e Conclusão de Tarefas

## Visão geral

Criar uma tabela `deal_history` que registra automaticamente eventos como movimentação entre colunas e conclusão de tarefas. Exibir esse histórico no modal de detalhes da negociação como uma timeline.

## Banco de dados

### Migration: criar tabela `deal_history`

- `id` uuid PK
- `deal_id` uuid NOT NULL
- `user_id` uuid NOT NULL
- `event_type` text NOT NULL (`column_change`, `task_completed`)
- `description` text NOT NULL (ex: "Moveu de Lead para Proposta", "Concluiu tarefa: Enviar mensagem")
- `metadata` jsonb (dados extras: coluna anterior, nova coluna, task_id, etc.)
- `created_at` timestamptz default now()

**RLS**: mesma lógica de `deal_tasks` — acesso baseado no deal via `funnel_members`.

## Frontend

### 1. Registrar eventos automaticamente

**`KanbanBoard.tsx`** — no `handleDragEnd`, após mover o deal, inserir registro em `deal_history` com `event_type = 'column_change'` e descrição "Moveu de X para Y".

**`DealDetailDialog.tsx`** — ao marcar tarefa como concluída (`handleToggleTask`), inserir registro com `event_type = 'task_completed'` e descrição da tarefa.

### 2. Exibir histórico no modal

**`DealDetailDialog.tsx`** — adicionar seção "Histórico" abaixo dos comentários (ou em tab/accordion), mostrando timeline com ícone por tipo de evento, descrição, autor e data/hora.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar `deal_history` com RLS |
| `src/components/KanbanBoard.tsx` | Inserir histórico ao mover deal |
| `src/components/DealDetailDialog.tsx` | Inserir histórico ao concluir tarefa + exibir timeline |

