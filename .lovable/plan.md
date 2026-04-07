

# Adicionar Filtro de Vendedor no Kanban

## Visão geral

Adicionar um select de "Vendedor" ao lado do campo de busca no KanbanBoard, permitindo filtrar negociações pelo responsável (`assigned_to`). Inclui opção "Todos" e "Sem responsável".

## Alterações em `src/components/KanbanBoard.tsx`

### 1. Novo estado
- `selectedSellerId` (string, default `"all"`)

### 2. Carregar lista de vendedores
- Após carregar os deals, já temos `profilesMap` com os nomes. Usar essa mesma lista para popular o select.
- Alternativa mais robusta: buscar membros do funil selecionado via `funnel_members` + `profiles` para mostrar todos os vendedores possíveis (não apenas os que têm deals). Usar essa abordagem.

### 3. UI — Select de vendedor
- Posicionar entre o campo de busca e o toggle de visualização
- Opções: "Todos os vendedores" | "Sem responsável" | lista de membros do funil
- Largura similar ao select de funil (~w-48)

### 4. Lógica de filtro
- Aplicar filtro em ambas as visualizações (Kanban e Lista)
- `"all"` → sem filtro
- `"unassigned"` → `deal.assigned_to === null`
- UUID → `deal.assigned_to === selectedSellerId`

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/KanbanBoard.tsx` | Adicionar estado, fetch de membros, select e lógica de filtro |

