## Objetivo
Remover o botão de "Recarregar tarefas automáticas" (ícone de refresh circular) da barra de tarefas do DealDetailView, e limpar o código morto associado.

## Alterações no arquivo `src/components/DealDetailView.tsx`
1. **Remover o botão JSX** (linhas ~1341-1350): eliminar o `<Button>` com `onClick={handleReloadTasks}` e o ícone `<RefreshCw>`.
2. **Remover o estado `reloadingTasks`** (linha ~128): eliminar `const [reloadingTasks, setReloadingTasks] = useState(false)`.
3. **Remover a função `handleReloadTasks`** (linhas ~427-439): eliminar toda a função que chama `recreate_deal_tasks`.
4. **Remover o import `RefreshCw`** (linha ~21): retirar `RefreshCw` do import do `lucide-react` (se não houver outros usos).

## Resultado esperado
A barra de tarefas no topo da sidebar direita do DealDetailView passa a exibir apenas o contador `0/0` e o botão de criar tarefa (`+`), sem o botão de refresh no meio.