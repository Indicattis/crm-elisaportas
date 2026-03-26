

# Kanban: Altura 100vh + Scroll Horizontal com Drag do Mouse

## Alterações

### 1. `src/components/KanbanBoard.tsx` — Altura 100vh
- No container `div` (linha 253), trocar classes para `h-[calc(100vh-<header_height>)]` e garantir `overflow-x-auto`
- As colunas e o container de skeleton também recebem altura completa

### 2. `src/components/KanbanBoard.tsx` — Scroll horizontal via drag do mouse
- Implementar lógica de "grab to scroll" no container horizontal: ao pressionar e arrastar o fundo (não um card), o container faz scroll horizontal
- Adicionar estados `isGrabbing`, `startX`, `scrollLeft` e handlers `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`
- Cursor muda para `grab`/`grabbing` durante a interação
- Ignorar o grab quando o target é um card (para não conflitar com DnD)

### 3. `src/components/KanbanColumn.tsx` — Altura completa
- Colunas recebem `h-full` para ocupar toda a altura disponível, com scroll vertical interno nos cards

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/KanbanBoard.tsx` | Altura 100vh + grab-to-scroll horizontal |
| `src/components/KanbanColumn.tsx` | Altura completa com scroll vertical |

