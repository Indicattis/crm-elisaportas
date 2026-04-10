

# Mostrar etapa atual das tarefas no DealCard

## Visão geral

Exibir no card do Kanban a etapa (task group stage) em que a negociação se encontra — ou seja, a primeira etapa que ainda possui tarefas pendentes.

## Alterações

### 1. `src/components/KanbanBoard.tsx` — Buscar etapa atual por deal

- Na `fetchOverdueTasks` (ou em novo callback paralelo), além das tarefas pendentes, buscar também o `stage_id` de cada tarefa pendente
- Para cada deal, identificar a etapa com menor `position` que tenha tarefas incompletas
- Buscar os dados das stages (`task_group_stages`) para obter nome e cor
- Criar um novo state `dealCurrentStageMap: Record<string, { name: string; color: string }>` e passá-lo ao `KanbanColumn`

### 2. `src/components/KanbanColumn.tsx` — Repassar ao DealCard

- Aceitar nova prop `dealCurrentStageMap` e passá-la ao `DealCard` como `currentStage`

### 3. `src/components/DealCard.tsx` — Exibir a etapa

- Nova prop opcional `currentStage?: { name: string; color: string }`
- Renderizar um Badge/indicador compacto (nome da etapa com dot colorido) na Row 3 ou Row 2, ao lado das informações existentes
- Se não houver etapa (sem tarefas ou sem stage_id), não exibir nada

### 4. `src/components/DealsListView.tsx` — Coluna de etapa (opcional)

- Adicionar coluna "Etapa" na tabela de lista, usando o mesmo map

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/KanbanBoard.tsx` | Buscar e calcular etapa atual por deal |
| `src/components/KanbanColumn.tsx` | Repassar prop `dealCurrentStageMap` |
| `src/components/DealCard.tsx` | Exibir badge com nome/cor da etapa |
| `src/components/DealsListView.tsx` | Coluna de etapa na lista |

