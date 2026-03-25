

# Cores Sólidas nas Colunas e Cards

## Resumo

Trocar as cores com baixa opacidade (6-20%) por cores sólidas mais vibrantes nas colunas do Kanban e nos cards de negociação.

## Implementação

### 1. `src/components/KanbanColumn.tsx`

- Background da coluna: de `rgba(rgb, 0.06)` para `rgba(rgb, 0.25)` (normal) e `0.35` (isOver)
- Manter `border-t-[3px]` com cor sólida

### 2. `src/components/DealCard.tsx`

- Background do card: de `rgba(rgb, 0.2)` para `rgba(rgb, 0.35)`
- Borda esquerda mantém cor sólida da tag
- Texto permanece legível com contraste adequado

