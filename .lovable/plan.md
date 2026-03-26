

# Animação de Conclusão de Tarefa (Fade-out ao Completar)

## Visão geral

Quando uma tarefa for marcada como concluída, ela fará uma animação de fade-out + scale-down e será removida visualmente da lista após a animação terminar. Tarefas concluídas não aparecerão mais na lista (apenas pendentes).

## Alterações em `src/components/DealDetailDialog.tsx`

### 1. Estado para controlar animação

- Adicionar state `completingTaskIds` (`Set<string>`) para rastrear quais tarefas estão animando.

### 2. Modificar `handleToggleTask`

- Ao marcar como concluída: adicionar o `taskId` ao set, aguardar ~400ms (duração da animação), depois executar o update no banco e refetch.
- Ao desmarcar: comportamento normal (sem animação).

### 3. Animação CSS no item da tarefa

- Aplicar classes de transição: `transition-all duration-400 ease-out`
- Quando o `taskId` estiver em `completingTaskIds`: aplicar `opacity-0 scale-95 max-h-0 overflow-hidden` para colapsar suavemente.

### 4. Filtrar tarefas concluídas da lista

- Exibir apenas tarefas com `completed = false` na lista principal, já que concluídas "somem" após a animação.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Adicionar animação de fade-out e filtro de concluídas |

