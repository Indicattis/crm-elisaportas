

# Ordenação de negociações por etapa (coluna do funil)

## Visão geral

Adicionar uma coluna `sort_order` na tabela `funnel_columns` para que cada etapa do funil tenha sua própria regra de ordenação. Um selectbox será adicionado na configuração de cada coluna em `/crm-config`. O Kanban aplicará a ordenação configurada ao exibir os deals.

## Alterações

### 1. Migração SQL
- Adicionar coluna `sort_order text NOT NULL DEFAULT 'channel'` na tabela `funnel_columns`
- Valores possíveis: `alphabetical`, `created_at`, `next_task`, `channel`

### 2. `src/components/FunnelColumnList.tsx`
- Adicionar um novo `Select` em cada linha de coluna com as opções:
  - `channel` — Canal de aquisição (padrão)
  - `alphabetical` — Ordem alfabética
  - `created_at` — Data de criação
  - `next_task` — Próxima tarefa
- Persistir no banco via `supabase.from("funnel_columns").update({ sort_order })`

### 3. `src/components/KanbanBoard.tsx`
- Expandir a interface `FunnelColumn` para incluir `sort_order`
- Após filtrar os deals por coluna (~linha 566-577), aplicar `.sort()` baseado no `sort_order` da coluna:
  - `alphabetical`: `deal.title.localeCompare()`
  - `created_at`: comparar `deal.created_at`
  - `next_task`: comparar `nextTaskMap[deal.id]` (deals sem tarefa ficam por último)
  - `channel`: comparar pela posição do canal de aquisição usando os dados já carregados (`channelIconMap` ou buscar posições dos canais)
- Para a ordenação por canal, carregar as posições dos canais de aquisição (`acquisition_channels.position`) e ordenar os deals pela posição do seu `acquisition_channel`

### 4. Dados de posição dos canais
- O `KanbanBoard` já carrega `channelIconMap` (nome → ícone). Expandir para também carregar `channelPositionMap` (nome → posição) a partir da tabela `acquisition_channels`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `sort_order` em `funnel_columns` |
| `src/components/FunnelColumnList.tsx` | Adicionar selectbox de ordenação por coluna |
| `src/components/KanbanBoard.tsx` | Aplicar ordenação dos deals conforme `sort_order` da coluna |

