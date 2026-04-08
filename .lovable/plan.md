

# Reestruturar página /results

## Visão geral

Mover o "Histórico por Etapa" de sidebar lateral para abaixo da seção de negociações. Adicionar paginação (10 itens/página) e filtro de data (padrão: mês atual) nas negociações. Filtro de data do histórico com padrão: dia anterior.

## Alterações em `src/pages/Results.tsx`

### Layout
- Remover layout `flex gap-6` com sidebar lateral
- Usar layout vertical (`space-y-8`): seção negociações em cima, histórico embaixo

### Filtro de data nas negociações
- Dois date pickers (início/fim) usando Popover+Calendar
- Padrão: primeiro dia do mês atual → hoje
- Filtrar `soldDeals`, `lostDeals`, `archivedDeals` por `updated_at` entre as datas selecionadas (via `.gte()` e `.lte()` no Supabase query)

### Paginação nas negociações
- Estado `page` (default 1), constante `PAGE_SIZE = 10`
- No `renderTable`, fatiar `filtered.slice((page-1)*10, page*10)`
- Renderizar componente Pagination abaixo da tabela com navegação de páginas
- Resetar página ao mudar tab, busca ou filtro

### Filtro de data no histórico
- Um date picker para selecionar o dia do histórico
- Padrão: dia anterior (`new Date(Date.now() - 86400000)`)
- Filtrar `deal_history` query com `.gte("created_at", startOfDay)` e `.lt("created_at", endOfDay)`

### Seção do histórico
- Ocupar largura total em vez de `w-80`
- Remover `ScrollArea` com height fixo, deixar fluir naturalmente

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/pages/Results.tsx` | Reestruturar layout, adicionar paginação e filtros de data |

