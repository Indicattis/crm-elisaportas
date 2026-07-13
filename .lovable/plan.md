# Exportar planejamento em PDF/Excel

## Botão de exportação
No cabeçalho de `/planejamento`, ao lado do filtro "Vendedores", adicionar botão **Exportar** (ícone `Download`) com `DropdownMenu`:
- **Baixar PDF**
- **Baixar Excel**

Desabilitado quando `visibleSellers.length === 0`.

## Conteúdo exportado (mesmo em ambos)
Respeita o filtro de vendedores atual — usa `visibleSellers` e `clients` já filtrados por `visibleIds`.

Cabeçalho:
- Título "Planejamento de Vendas"
- Data/hora de geração (`pt-BR`)
- Vendedores selecionados (ou "Todos" quando nenhum filtro)

Para cada vendedor visível, uma seção com:
- Nome do vendedor + contagem de clientes + subtotal (BRL)
- Tabela de clientes: Nome | Temperatura (Quente/Morno) | Valor (BRL)
- Ordenação: quente antes de morno, depois maior valor, depois mais recente (mesma regra da coluna)

Rodapé com os 4 índices:
- Projetado — Quente
- Projetado — Morno
- Faturamento atual da empresa
- Total

## Excel (.xlsx)
Usar `xlsx` (SheetJS) — leve, roda no browser sem servidor.
- Uma aba **Resumo**: cabeçalho com filtro e data, tabela com os 4 índices, tabela com subtotais por vendedor.
- Uma aba **Clientes**: colunas `Vendedor | Cliente | Temperatura | Valor`, com todos os clientes visíveis.
- Coluna de valor formatada como moeda BRL; largura das colunas ajustada.
- Nome do arquivo: `planejamento-YYYY-MM-DD.xlsx`.

## PDF
Usar `jspdf` + `jspdf-autotable` (ambos já leves, client-side).
- A4 retrato, margens confortáveis, fonte Helvetica.
- Cabeçalho com título, data e filtro aplicado.
- Para cada vendedor: subtítulo com nome + subtotal, seguido de `autoTable` com os clientes.
- Bolinha de temperatura substituída por texto colorido (vermelho Quente / âmbar Morno).
- Bloco final com os 4 índices em destaque.
- Rodapé com numeração de página.
- Nome do arquivo: `planejamento-YYYY-MM-DD.pdf`.

## Arquivos
- `src/pages/SalesPlanning.tsx` — adicionar botão/menu e handlers `handleExportPdf`/`handleExportXlsx`, passando `visibleSellers`, `clients` filtrados, `hotSum`, `warmSum` e `currentRevenue` (elevar leitura do faturamento atual para a página, ou lê-lo sob demanda no export).
- `src/lib/planning-export.ts` — novo módulo com `exportPlanningToPdf(...)` e `exportPlanningToXlsx(...)`, isolando formatação e dependências.

## Dependências a instalar
- `xlsx`
- `jspdf`
- `jspdf-autotable`

## Detalhes técnicos
- O "Faturamento atual" hoje mora dentro do `PlanningFooter`. Para reutilizar no export sem duplicar fetch, mover o `useEffect` que carrega `company_revenue` para `SalesPlanning.tsx` e passar `currentRevenue`/`setCurrentRevenue` como props ao `PlanningFooter`.
- Formatação BRL: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Ordenação replicada do `PlanningColumn` (hot→warm, valor desc, data desc) via helper compartilhado dentro de `planning-export.ts`.
- Toast de sucesso/erro nas exportações.
