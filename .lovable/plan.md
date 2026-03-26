

# Dashboard de Indicadores do CRM (`/dashboard`)

## Visão geral

Nova página `/dashboard` com KPIs do CRM e gráficos de pizza mostrando distribuição de negociações por etapa do funil e por vendedor.

## 1. `src/pages/Dashboard.tsx` — Nova página

### KPIs (cards no topo)
- **Total de negociações ativas** (não arquivadas, status != Vendido/Perdida)
- **Valor total no pipeline** (soma dos values das ativas)
- **Negociações vendidas** (count + valor total)
- **Negociações perdidas** (count)
- **Taxa de conversão** (vendidas / (vendidas + perdidas) × 100)
- **Ticket médio** (valor médio das vendidas)

### Filtros
- Seletor de funil (igual ao existente em Results)

### Gráficos de pizza (usando Recharts via componentes chart.tsx existentes)
1. **Por etapa do funil** — conta de deals agrupados por `status` (colunas do funil), cores das colunas
2. **Por vendedor** — conta de deals agrupados por `assigned_to`, usando nomes do profiles

### Dados
- Query `deals` filtrando por funil selecionado
- Query `funnel_columns` para nomes/cores das etapas
- Query `profiles` para nomes dos vendedores

## 2. `src/components/Header.tsx` — Novo item no menu

Adicionar item `{ path: "/dashboard", label: "Dashboard", icon: PieChart }` no array `allNavItems`, antes de "Configurações".

## 3. `src/App.tsx` — Nova rota

Adicionar `<Route path="/dashboard" element={<Dashboard />} />` dentro do AuthGuard.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/Dashboard.tsx` | Criar página com KPIs e gráficos |
| `src/components/Header.tsx` | Adicionar item "Dashboard" no menu |
| `src/App.tsx` | Adicionar rota `/dashboard` |

