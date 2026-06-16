## Objetivo
Diminuir o tempo da tela de loading em `/` (KanbanBoard).

## Diagnóstico
Hoje o `loading=true` só vira `false` depois que TUDO termina (colunas, deals, perfis, tags, canais, membros, **tarefas em atraso, progresso de tarefas, cores diárias**). Os dois maiores gargalos:

1. **`fetchOverdueTasks` e `fetchTaskProgress` fazem queries quase idênticas** na tabela `deal_tasks` — buscam praticamente as mesmas colunas (`deal_id, completed, stage_id, deadline_at, cycle`) para os mesmos `deal_id`s. Hoje são 2 varreduras separadas.
2. **A paginação dos chunks é sequencial** (`for (const chunk of chunkArray(dealIds, 100))` com `await` dentro). Com muitos deals, isso vira N requisições em série.
3. **A UI espera todos os dados secundários** (progresso, stages, cores diárias) para mostrar qualquer card. Esses dados são usados para badges/indicadores — os cards podem aparecer antes e ir "preenchendo".

## Mudanças propostas

### 1. Unificar as duas queries de `deal_tasks` (maior ganho)
Substituir `fetchOverdueTasks` + `fetchTaskProgress` por uma única função `fetchAllTasksData(deals)` que:
- Faz uma única consulta `select("deal_id, completed, stage_id, deadline_at, cycle")` por chunk.
- Calcula em memória os 4 mapas derivados: `overdueDeals`, `nextTaskMap`, `dealStageMap`, `taskProgressMap`.
- Mantém a busca de `task_group_stages` (nomes/cores) como hoje, após o agrupamento.

Isso reduz o volume de I/O à metade nas tabelas de tarefas, que são a parte mais pesada do load.

### 2. Paginar chunks em paralelo
Trocar o `for…of` sequencial por `Promise.all(chunks.map(...))`. Os chunks são independentes; rodar em paralelo reduz drasticamente o tempo total quando há muitos deals.

### 3. Mostrar o board antes dos dados de tarefas
Mover `setLoading(false)` para logo após o BLOCK 1 (colunas + deals + membros + tags + canais). Os dados de tarefas/cores/progresso continuam carregando em background e os badges (atrasada, progresso X/Y, etapa) aparecem progressivamente — os cards já ficam visíveis e interativos.

Para evitar "flash" de cards sem badges, manter um estado leve `tasksLoading` que apenas oculta os indicadores enquanto ainda estiverem carregando (sem bloquear o board inteiro).

### 4. Pequenas otimizações adicionais
- Em `fetchColumns`, paralelizar a busca de `column_entry_requirements` com `fetchDeals` (hoje espera colunas terminarem).
- Remover do `select("*")` em `fetchDeals` colunas grandes não usadas no card — manter como está se não houver colunas pesadas óbvias; verificar antes de cortar.

## Resultado esperado
- Tempo de "tela de loading cheia" cai significativamente (cards aparecem assim que os deals chegam, ~1 round-trip em vez de esperar 2 varreduras seriais de `deal_tasks`).
- Badges de tarefa/progresso preenchem em seguida sem bloquear interação.

## Arquivos afetados
- `src/components/KanbanBoard.tsx` (única mudança de código).

## Sem mudanças
- Schema, RLS, triggers, lógica de negócio e UI dos cards permanecem iguais.
