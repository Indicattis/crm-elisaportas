## Nova aba "Vendas"

Adicionar uma página dedicada em `/vendas` acessível pelo header, listando todas as negociações concluídas como Vendidas de todos os funis, no mesmo formato tabular usado em `/results`.

### Alterações

1. **`src/components/Header.tsx`**
   - Adicionar item `{ path: "/vendas", label: "Vendas", icon: DollarSign }` em `allNavItems`, posicionado antes de "Relatórios".

2. **`src/pages/Sales.tsx`** (novo)
   - Página inspirada em `/results` (mesma paleta glassmorphism e tabela shadcn).
   - Consulta: `deals` com `status = 'Vendido'` e `archived = false`, sem filtro de funil (todos os funis).
   - Filtros no topo:
     - Busca por nome/telefone.
     - Período (date range, padrão: mês atual, usando `updated_at`).
     - Vendedor (dropdown com todos os vendedores; para role `vendedor`, trava no próprio id).
     - Funil (opcional, "Todos" por padrão).
   - Tabela com colunas: **Nome, Valor, Vendedor, Funil, Canal, Data (updated_at)**.
   - Rodapé com **total de vendas** (contagem) e **valor total** somado.
   - Paginação `PAGE_SIZE = 10` reutilizando o componente `Pagination`.
   - Clique na linha navega para `/deal/:id`.
   - Carrega em paralelo: funis, vendedores (via `profiles` + filtro por role `vendedor` no `user_roles`), e deals.

3. **`src/App.tsx`**
   - Registrar `<Route path="/vendas" element={<Sales />} />` dentro do `AppLayout` protegido.

### Detalhes técnicos
- Reutilizar `profilesMap` para exibir nome do vendedor a partir de `assigned_to`.
- Reutilizar `funnels` para exibir o nome do funil a partir de `funnel_id`.
- Formatar valor em BRL com `Intl.NumberFormat`.
- Nenhuma migração de banco necessária; RLS existente em `deals` já cobre a leitura.
- Sem alterações em lógica de negócio existente.
