

# Filtro por Período no Dashboard

## Alteração em `src/pages/Dashboard.tsx`

Adicionar dois date pickers (Data Início e Data Fim) ao lado do seletor de funil, filtrando os deals pelo campo `created_at`:

- Importar `Popover`, `PopoverTrigger`, `PopoverContent`, `Calendar`, `Button`, `CalendarIcon`, `format`
- Dois estados: `startDate` e `endDate` (ambos `Date | undefined`)
- Na query de deals, adicionar `.gte("created_at", startDate)` e `.lte("created_at", endDate)` quando definidos
- Adicionar `startDate` e `endDate` como dependências da queryKey
- Layout: date pickers inline ao lado do seletor de funil na barra de filtros

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/pages/Dashboard.tsx` | Adicionar filtros de data início/fim |

