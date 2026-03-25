

# Drag por Long Press no Card Inteiro

## O que muda

Atualmente o drag só funciona pelo ícone grip. Passará a funcionar clicando em qualquer parte do card, com delay de 500ms (long press) para não conflitar com o click de edição.

## Implementação

**`src/components/KanbanBoard.tsx`**
- Trocar `PointerSensor` por `TouchSensor` + `MouseSensor` (ou manter `PointerSensor`) com `activationConstraint: { delay: 500, tolerance: 5 }` em vez de `distance: 8`

**`src/components/DealCard.tsx`**
- Mover `{...attributes}` e `{...listeners}` do botão grip para o `<div>` raiz do card
- Remover o botão grip (ícone `GripVertical`) já que todo o card é arrastável
- Manter `onClick` para edição — o dnd-kit com delay permite distinguir click rápido de drag

