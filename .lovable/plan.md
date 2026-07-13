# Índices e filtro em /planejamento

## Filtro de vendedor
- Novo controle multi-select no topo da página, ao lado do cabeçalho, listando os vendedores já carregados.
- Quando vazio = todos. Quando preenchido, apenas as colunas selecionadas ficam visíveis e os índices consideram só elas.
- Estado local em `SalesPlanning.tsx` (sem persistência).

## Rodapé fixo de índices
Barra `glass` fixa no bottom da página (`fixed bottom-0`, respeitando padding lateral), com 4 blocos em linha (empilha em telas menores):

1. **Faturamento Projetado — Quente**: soma de `value` de clientes `hot` das colunas visíveis. Bolinha vermelha.
2. **Faturamento Projetado — Morno**: soma de `value` de clientes `warm` das colunas visíveis. Bolinha âmbar.
3. **Faturamento atual da empresa**: valor único global, editável apenas por admin (input inline com máscara BRL). Vendedores só visualizam.
4. **Total**: soma dos três acima.

Todos os valores em BRL. O rodapé fica acima do conteúdo com `z-40` e adiciona `padding-bottom` no container das colunas para não sobrepor.

## Persistência do "Faturamento atual"
Nova tabela `public.company_revenue` (linha única):
- `id` fixo (`singleton` boolean unique = true), `value` numeric, `updated_by`, `updated_at`.
- RLS: SELECT para authenticated; UPDATE apenas admin (via `has_role`).
- GRANTs para authenticated e service_role.
- Seed inicial com value = 0.

Edição otimista com debounce ao sair do input; toast em erro.

## Arquivos

- `src/pages/SalesPlanning.tsx` — adicionar filtro multi-select, cálculo dos totais a partir de `clients` filtrados por vendedores visíveis, renderizar `<PlanningFooter />`.
- `src/components/planning/PlanningFooter.tsx` — novo componente com os 4 blocos e input editável.
- Migração criando `company_revenue` com RLS/GRANTs e seed.

## Detalhes técnicos

- Cálculo: filtrar `clients` por `seller_id ∈ vendedoresVisíveis` antes de somar por `temperature`.
- Admin check via `useUserRole()` já existente.
- Formatação: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Input: exibir formatado, editar como número; salvar em `onBlur`/Enter.
- Realtime não necessário nesta versão; refetch ao focar aba é opcional (fora de escopo).
