

# Adicionar filtros de Estado e Cidade no cabeçalho do Kanban

## Visão geral

Adicionar o componente `StateCitySelect` (já existente) na barra de filtros do KanbanBoard, ao lado do filtro de vendedor. Os deals serão filtrados por estado e cidade selecionados.

## Alterações em `src/components/KanbanBoard.tsx`

### Estado
- Adicionar `filterState` e `filterCity` como novos estados (`useState("")`)
- Importar `StateCitySelect` de `@/components/StateCitySelect`

### Filtro na barra de cabeçalho
- Inserir `StateCitySelect` após o select de vendedor, usando o modo `compact` para manter a altura consistente com os outros filtros
- Props: `state={filterState}`, `city={filterCity}`, `onStateChange`, `onCityChange`

### Lógica de filtragem
- Adicionar um filtro nos deals (tanto na view kanban quanto na list view) que verifica:
  - Se `filterState` está preenchido, `deal.state === filterState`
  - Se `filterCity` está preenchido, `deal.city === filterCity`

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/KanbanBoard.tsx` | Adicionar estados, componente e lógica de filtro |

