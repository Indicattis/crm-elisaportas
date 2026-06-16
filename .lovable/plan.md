## Problema

A bolinha colorida no `DealCard` está dentro de um container que recebe `{...listeners}` e `{...attributes}` do `useSortable` (dnd-kit). Isso faz com que o `pointerdown` na bolinha seja capturado pelo sistema de drag, e o `onClick` muitas vezes não dispara (ou só dispara em condições específicas) — então a cor parece mudar "sozinha" em alguns casos, ou não mudar quando clicada.

Além disso, o card inteiro tem `onClick={onClick}` que abre o detalhe do deal, então qualquer clique que escapar do botão abre o modal.

## Solução

Em `src/components/DealCard.tsx`, ajustar o `<button>` da bolinha para:

1. Adicionar `onPointerDown={(e) => e.stopPropagation()}` — impede que o dnd-kit inicie um drag a partir do clique na bolinha.
2. Adicionar `onMouseDown={(e) => e.stopPropagation()}` por segurança (alguns navegadores).
3. Manter `onClick` com `e.stopPropagation()` + `e.preventDefault()` para não abrir o modal do deal nem propagar pro card.
4. Trocar a tag `<button>` por `type="button"` explícito (boa prática, já que não é submit).

Nenhuma outra mudança: a lógica de cores permitidas (`allowedDailyColors`) e o ciclo `red → yellow → green` continuam iguais. Apenas garantimos que o clique na bolinha é o ÚNICO gatilho de mudança.

## Arquivos

- `src/components/DealCard.tsx` — ajustar handlers do botão da bolinha colorida.
