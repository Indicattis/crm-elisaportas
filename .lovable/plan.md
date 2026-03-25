

# Card com Background de Tag + Ícone de Troca Rápida

## Resumo

Cada card de negociação terá o background colorido pela primeira tag associada (vibrante, ~20-25% opacidade). Um ícone de tag no card abrirá um Popover para trocar/adicionar tags rapidamente sem abrir o detalhe.

## Implementação

### 1. `src/components/DealCard.tsx`

- **Background colorido**: usar a cor da primeira tag como `backgroundColor` com `rgba(r,g,b, 0.2)` e borda lateral esquerda sólida com a cor da tag
- Adicionar helper `hexToRgb` para converter cor hex em RGB
- **Ícone de tag**: adicionar botão com ícone `Tag` (lucide) no canto superior direito do card
- Ao clicar no ícone, abrir Popover com lista de todas as tags disponíveis (checkboxes) para adicionar/remover tags do deal
- O clique no ícone deve ter `e.stopPropagation()` para não abrir o detalhe do deal
- Novo prop `allTags` (todas as tags do usuário) e `onTagsChanged` callback

### 2. `src/components/KanbanBoard.tsx`

- Buscar todas as tags do usuário (`allTags`) para passar ao `DealCard`
- Passar `allTags` via `KanbanColumn` até o `DealCard`
- Adicionar handler `onTagsChanged` que faz toggle de deal_tags (insert/delete) e atualiza `dealTagsMap`

### 3. `src/components/KanbanColumn.tsx`

- Receber e repassar `allTags` e `onTagsChanged` para cada `DealCard`

## Visual do Card

```text
┌─────────────────────────┐
│█ Título do Deal    [🏷] │  ← borda esquerda cor da tag, ícone tag
│  👤 Cliente              │
│  💲 R$ 1.200,00          │
│  [Tag1] [Tag2]           │  ← badges das tags
│  📅 01/01  ⏱ 3d          │
└─────────────────────────┘  ← background com cor da 1ª tag @ 20%
```

