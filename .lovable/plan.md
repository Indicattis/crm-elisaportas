

# Desabilitar Seleção de Texto/Imagem nos Cards do Kanban

## Problema

No mobile, o navegador captura o long-press para seleção de texto/imagem, impedindo o drag-and-drop de funcionar corretamente nos cards.

## Solução

Adicionar classes e atributos no `DealCard.tsx` para desabilitar seleção nativa e comportamentos de touch que conflitam com o dnd-kit.

## Alteração em `src/components/DealCard.tsx`

No elemento raiz do card (linha 66), adicionar:
- Classes: `select-none touch-none` e regras CSS inline para WebKit
- `draggable={false}` e `onDragStart={e => e.preventDefault()}` para bloquear drag nativo do browser
- Propagação via `[&_*]:select-none` e `[&_img]:pointer-events-none` para cobrir todos os filhos

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealCard.tsx` | Adicionar classes anti-seleção e touch no card |

