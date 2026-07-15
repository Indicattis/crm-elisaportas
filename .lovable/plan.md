## Objetivo

Criar página `/perdas` (negociações perdidas/desqualificadas) com o mesmo layout de `/vendas`, e adicionar botão no header.

## Mudanças

### 1. Header — `src/components/Header.tsx`
- Adicionar novo item de navegação "Perdas" entre "Vendas" e "Planejamento", usando ícone `TrendingDown` (ou `XCircle`) do lucide-react.
- Aparece tanto no menu desktop quanto na navegação inferior mobile (mesmo padrão dos demais).

### 2. Nova rota `/perdas` — `src/App.tsx`
- Registrar `<Route path="/perdas" element={<Losses />} />` dentro do `AppLayout` protegido.

### 3. Nova página `src/pages/Losses.tsx`
- Clone estrutural de `src/pages/Sales.tsx` com as diferenças:
  - Título: "Perdas" / subtítulo apropriado.
  - Query: buscar deals com `status = 'disqualified'` (ou o status usado para perdidas — confirmar em `Results.tsx`/`Reports.tsx`) em vez de vendidos.
  - Ordenação/filtro por data: usar `updated_at` (data em que foi marcada como perdida) — não existe `lost_at`. Sem popover de edição de data.
  - KPI cards: "Total de perdas" e "Valor total perdido" com anel em cor `destructive`/`ring-destructive/15` no lugar de `success`.
  - Barra de destaque lateral do card e badges em tons destrutivos (vermelho) em vez de verde/success.
  - Exibir **motivo da perda** (`loss_reason`) em destaque no card, ao lado do valor.
  - Ao clicar no card: navegar para `/deal/:id` (página normal), já que não há tela específica de "perda vendida"; sem edição de data.
- Manter filtros existentes de `/vendas` (período, vendedor, busca) adaptados.

### 4. Fora do escopo
- Nenhuma alteração de banco / RLS.
- Nenhuma nova página de detalhe de perda (`/loss/:id`) — usa `/deal/:id`.

## Detalhes técnicos

- Confirmar o valor de status para perdas lendo `Reports.tsx` (provavelmente `status = 'lost'` ou `disqualified` com `loss_reason`).
- Reutilizar componentes de UI: `Card`, `Badge`, filtros, `format` de `date-fns`.
- Preservar espaçamento lateral (`max-w-7xl mx-auto p-6 space-y-8`) igual `/vendas` e `/relatorios`.
