

# Otimização de performance do Kanban: eliminar cascata de queries

## Problema

O KanbanBoard faz **8+ requisições sequenciais** ao banco, criando um waterfall:
1. fetchFunnels
2. fetchColumns + fetchDeals + fetchDealTags (paralelo, mas fetchDealTags sem filtro)
3. fetchProfiles (espera deals)
4. fetchOverdueTasks (espera deals, faz 2 queries internas)
5. fetchDailyColors (espera deals)
6. fetchFunnelMembers (paralelo mas separado)
7. fetchAllTags
8. fetchChannels

Cada query passa por RLS policies com subqueries (`can_access_deal`, `has_role`), multiplicando a latência. Com 362 deals ativos, o tempo acumula.

## Solução

### 1. Paralelizar TUDO no carregamento inicial
Unificar em um único `Promise.all` com todas as queries que não dependem umas das outras:
- columns, deals, dealTags, funnelMembers, allTags, channels → paralelo

### 2. Consolidar queries dependentes de deals
Após receber os deals, fazer `fetchProfiles`, `fetchOverdueTasks` e `fetchDailyColors` em um **segundo `Promise.all`** em vez de 3 useEffects separados que disparam em cascata.

### 3. Filtrar deal_tags por funil
Atualmente `fetchDealTags` busca TODOS os deal_tags. Filtrar usando os IDs dos deals do funil selecionado.

### 4. Selecionar apenas colunas necessárias
`fetchDeals` usa `select("*")`, trazendo campos como `notes` que não são usados no Kanban. Selecionar apenas os campos necessários para os cards.

## Alterações técnicas

### `src/components/KanbanBoard.tsx`
- Refatorar os ~7 useEffects de carregamento em 2 blocos:
  - **Bloco 1** (quando `selectedFunnelId` muda): `Promise.all([fetchColumns, fetchDeals, fetchFunnelMembers, fetchAllTags, fetchChannels])`
  - **Bloco 2** (quando `deals` muda): `Promise.all([fetchProfiles, fetchOverdueTasks, fetchDailyColors, fetchDealTags])`
- Em `fetchDeals`: trocar `select("*")` por `select("id, title, value, status, assigned_to, funnel_id, created_at, updated_at, heat, archived, phone, email, acquisition_channel, deal_number, state, city, user_id")`
- Em `fetchDealTags`: adicionar filtro `.in("deal_id", dealIds)` usando os IDs dos deals carregados

## Impacto esperado
- Redução de ~60% no tempo de carregamento (de ~8 queries sequenciais para 2 blocos paralelos)
- Menos dados trafegados (select específico, tags filtradas)

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/KanbanBoard.tsx` | Consolidar useEffects e otimizar queries |

