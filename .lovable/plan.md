## Objetivo

Permitir que o admin defina, em cada coluna do funil, quais cores (Vermelho/Amarelo/Verde) ficam disponíveis nas "bolas coloridas" diárias.

## Banco

Migration:
- Adicionar coluna `daily_colors text[] NOT NULL DEFAULT ARRAY['red','yellow','green']` em `public.funnel_columns`.

Backfill é coberto pelo default. Sem mudanças de RLS.

## Frontend

### `src/components/FunnelColumnList.tsx`
- Logo abaixo do checkbox "Bolas coloridas", quando `has_daily_color !== false`, renderizar 3 toggles em linha (cada um com bolinha colorida + checkbox) para Vermelho, Amarelo e Verde.
- Persistir array atualizado em `funnel_columns.daily_colors` ao mudar.
- Garantir pelo menos 1 cor selecionada (não permitir desmarcar a última — desabilitar o último checkbox marcado).

### `src/components/KanbanBoard.tsx`
- Ao carregar colunas, propagar `daily_colors` para o `DealCard` (via prop da coluna já em uso).
- Em `set_green_on_task_completion` o backend continua escrevendo `green`; o frontend simplesmente não pinta verde se a coluna não tiver verde na lista (renderiza vermelho como fallback). Isso atende ao pedido "verde só acontece se estiver na lista" sem alterar trigger.

### `src/components/DealCard.tsx`
- Aceitar prop `allowedColors: string[]` (default `['red','yellow','green']`).
- `COLOR_CYCLE` passa a ser computado dinamicamente: ciclo segue a ordem `['red','yellow','green']` filtrada por `allowedColors`. Clique avança para a próxima cor permitida (com wrap).
- Se a cor atual no banco não estiver em `allowedColors`, exibir a primeira cor permitida como fallback.

Sem nenhum outra mudança.

## Notas técnicas

- O default `['red','yellow','green']` mantém comportamento atual para colunas existentes.
- Não há migração de dados; o array vem com as 3 cores.
- A lógica de cores fixas vs. customizadas fica isolada: para evoluir para cores arbitrárias depois, basta trocar o seletor sem mexer no schema.
