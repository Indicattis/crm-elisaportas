## Contexto
O usuário reportou que o arrastar de cards no Kanban "parece mais demorado" do que o valor atual de `100 ms` configurado no `@dnd-kit/core` (`PointerSensor`).

## Plano
1. Verificar se existe algum outro sensor, gatilho ou listener que possa estar adicionando latência percebida ao drag (ex: `onPointerDown` que dispara re-render, eventos de scroll, etc.).
2. Ajustar o `activationConstraint.delay` do `PointerSensor` no `KanbanBoard.tsx` para um valor mais baixo (ex: `50 ms` ou `0 ms`), garantindo que o `tolerance` continue a evitar drags acidentais.
3. Testar o comportamento para confirmar que o início do drag ficou mais imediato e que o `tolerance` ainda previne movimentações indesejadas.