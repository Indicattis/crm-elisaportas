

# Auto-alterar bola colorida ao concluir tarefa

## Visão geral

Quando o vendedor concluir uma tarefa (checkbox marcado), o sistema verifica se a bola de status diário do deal está vermelha. Se estiver, altera automaticamente para verde.

## Alteração

**Arquivo:** `src/components/DealDetailDialog.tsx`

Na função `handleToggleTask`, após o update da tarefa e antes do `fetchDealTasks()`, adicionar lógica:

1. Se `completed === true` e o deal existe:
   - Buscar o registro em `deal_daily_color` para o deal no dia atual
   - Se o registro existir e `color === "red"`, atualizar para `"green"`
   - Se não existir registro, criar um com `color: "green"` (pois o padrão é vermelho)
2. Usar o mesmo padrão de upsert já usado no `KanbanBoard.tsx` (check existing → update ou insert)

Isso garante que ao completar qualquer tarefa, o indicador visual do card no Kanban reflete a ação do vendedor automaticamente.

