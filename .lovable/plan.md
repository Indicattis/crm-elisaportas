

# Histórico por Etapa na Página de Resultados

## Visão geral

Criar uma nova aba "Histórico por Etapa" na página `/results` que exibe um acompanhamento diário: para cada dia, quantas negociações chegaram a cada etapa e o valor total. Vendedores veem apenas seus próprios dados; administradores veem tudo (ou filtram por vendedor).

## Fonte de dados

A tabela `deal_history` já registra eventos `column_change` com `metadata: { from, to }`, `user_id`, `created_at` e `deal_id`. Cruzando com `deals.value` e `deals.assigned_to`, conseguimos montar o relatório sem criar novas tabelas.

A query será feita no client-side:
1. Buscar registros de `deal_history` com `event_type = 'column_change'` (filtrado por funil se selecionado)
2. Fazer join local com os deals para obter o `value` e `assigned_to`
3. Agrupar por dia (`created_at` truncado) + etapa destino (`metadata->to`)
4. Filtrar: vendedores veem só `assigned_to = auth.uid()`, admins veem tudo

## Alterações em `src/pages/Results.tsx`

### 1. Nova aba "Histórico por Etapa"
- Adicionar tab com ícone `History` do lucide-react
- Conteúdo: tabela agrupada por data (descendente)

### 2. Fetch de dados do histórico
- Buscar `deal_history` com `event_type = 'column_change'`
- Buscar deals associados para obter `value` e `assigned_to`
- Usar o role do contexto (`useUserRole`) para decidir filtro:
  - **Vendedor**: filtrar `deals.assigned_to = currentUserId`
  - **Admin**: mostrar todos (opcionalmente filtrar por vendedor com select)

### 3. Processamento e agrupamento
- Agrupar por dia (data formatada `dd/MM/yyyy`) e etapa destino (`metadata.to`)
- Para cada grupo: contar negociações distintas e somar valores
- Estrutura: `Map<dia, Map<etapa, { count, totalValue }>>`

### 4. Apresentação
- Tabela com colunas: **Data** | **Etapa** | **Qtd. Negociações** | **Valor Total**
- Ordenação por data mais recente primeiro
- Formatação de valores em BRL
- Filtro de período opcional (data início/fim) para limitar volume

### 5. Controle de acesso
- Importar `useUserRole` do RoleContext
- Obter `currentUserId` via `supabase.auth.getUser()`
- RLS da `deal_history` já filtra por acesso ao funil, mas o filtro adicional por `assigned_to` garante que vendedores vejam só seu histórico

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/pages/Results.tsx` | Adicionar aba "Histórico por Etapa" com fetch, agrupamento e tabela |

