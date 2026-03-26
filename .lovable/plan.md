

# Paginação e Pesquisa na Página de Clientes

## Visão geral

Adicionar barra de pesquisa (por nome ou telefone) e paginação server-side de 25 registros por página na página `/clients`.

## Alterações em `src/pages/Clients.tsx`

### 1. Novos estados
- `search` (string) — termo de busca
- `page` (number) — página atual (começa em 0)
- `totalCount` (number) — total de registros para calcular páginas
- Constante `PAGE_SIZE = 25`

### 2. Busca server-side com filtro e paginação
- Usar `.or('nome.ilike.%termo%,telefone.ilike.%termo%')` quando houver texto de pesquisa
- Usar `.range(page * 25, (page + 1) * 25 - 1)` para paginação
- Usar `{ count: 'exact', head: false }` no select para obter o total
- Resetar `page` para 0 quando `search` mudar
- Debounce de ~300ms no input de pesquisa

### 3. Barra de pesquisa
- Input com ícone de busca acima da tabela, placeholder "Buscar por nome ou telefone..."

### 4. Paginação
- Abaixo da tabela, exibir controles de página anterior/próxima com indicador "Página X de Y"
- Usar os componentes `Pagination*` já existentes

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/Clients.tsx` | Adicionar search, paginação server-side e controles de UI |

