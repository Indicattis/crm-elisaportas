

# Animação de expansão e fechamento das colunas do Kanban

## Visão geral

Adicionar transição suave de largura ao expandir/recolher colunas, em vez da troca abrupta entre os dois estados.

## Abordagem

Em vez de renderizar condicionalmente dois blocos diferentes (`collapsed` vs expandido), unificar em um único `div` que transiciona a largura via CSS (`transition: width 300ms ease`). O conteúdo interno será controlado com opacidade para aparecer/desaparecer suavemente.

## Alterações

### `src/components/KanbanColumn.tsx`

- Remover o `if (collapsed) return (...)` que renderiza um bloco separado
- Usar um único container com `transition-all duration-300 ease-in-out` e largura dinâmica (`w-12` quando collapsed, `w-80` quando expandido)
- Conteúdo expandido (cards, valor, botões): wrappado com `overflow-hidden` e `opacity-0`/`opacity-100` com transição
- Conteúdo collapsed (texto vertical, chevron): visível quando collapsed com transição de opacidade inversa
- O `ChevronRight` rotaciona suavemente (180°) ao expandir

### `tailwind.config.ts`

- Nenhuma alteração necessária — `transition-all`, `duration-300`, `opacity-*` já disponíveis

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/KanbanColumn.tsx` | Unificar render collapsed/expanded com transições CSS |

