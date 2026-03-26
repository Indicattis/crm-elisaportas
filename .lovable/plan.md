

# Toggle Kanban / Lista na Página Inicial

## Visão geral

Adicionar um botão toggle (ícones Kanban/Lista) ao lado direito do seletor de funil, permitindo alternar entre a visualização Kanban atual e uma nova visualização em tabela/lista.

## 1. `src/components/KanbanBoard.tsx` — Toggle e estado

- Adicionar estado `viewMode: "kanban" | "list"` (default `"kanban"`)
- Na barra superior (div `px-6 pt-4`), adicionar à direita um `ToggleGroup` com dois itens:
  - `LayoutGrid` icon → valor `"kanban"`
  - `List` icon → valor `"list"`
- Quando `viewMode === "list"`, renderizar `<DealsListView>` ao invés do DndContext/Kanban

## 2. `src/components/DealsListView.tsx` — Novo componente

- Recebe `deals`, `columns`, `dealTagsMap`, `allTags`, `profilesMap`, callbacks
- Tabela com colunas: Título, Cliente, Status (badge colorida), Responsável, Valor, Dias na Etapa, Tags, Data Criação
- Cada linha clicável → abre `onEditDeal`
- Ordenação por coluna (status agrupado pela ordem das colunas do funil)
- Botão "Capturar" inline quando sem responsável

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/KanbanBoard.tsx` | Adicionar toggle de visualização e renderização condicional |
| `src/components/DealsListView.tsx` | Criar componente de visualização em lista/tabela |

