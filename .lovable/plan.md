

# Colunas Translúcidas no Modo Escuro

## Alteração em `src/components/KanbanColumn.tsx`

Detectar o tema atual (verificando `document.documentElement.classList.contains('dark')` ou usando o hook `useTheme`) e, no modo escuro, aplicar a cor da coluna com opacidade reduzida em vez de sólida:

- **Corpo da coluna**: cor com ~20% de opacidade (ex: `rgba(r, g, b, 0.2)`)
- **Header da coluna**: cor com ~35% de opacidade (em vez do `darkenHex`)

### Implementação

- Criar helper `hexToRgba(hex, alpha)` para converter hex em rgba
- Importar `useTheme` de `@/hooks/use-theme`
- No modo escuro: `backgroundColor: hexToRgba(color, 0.2)` para corpo e `hexToRgba(color, 0.35)` para header
- No modo claro: manter comportamento atual (cor sólida)

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/KanbanColumn.tsx` | Aplicar cores translúcidas no modo escuro |

