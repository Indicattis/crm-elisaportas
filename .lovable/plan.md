

# Nova aba "Relatórios" com geração de PDF

## Visão geral

Criar uma página `/relatorios` com filtros (data, funil, vendedor, canal) e 4 tipos de relatório que podem ser gerados como PDF para impressão via `window.print()`.

## Abordagem técnica

Usar `window.print()` com uma div de conteúdo formatada com classes `@media print` do Tailwind. Isso evita dependências externas e gera PDFs nativos do navegador com boa qualidade. O usuário seleciona o tipo de relatório, aplica filtros, visualiza uma prévia na tela e clica "Gerar PDF" para abrir o diálogo de impressão.

## Alterações

### 1. Criar `src/pages/Reports.tsx`
- Filtros: período (data início/fim), funil, vendedor, canal de aquisição
- 4 tipos de relatório selecionáveis via tabs:
  - **Negociações por período**: tabela com título, telefone, valor, status, responsável, data
  - **Resumo de desempenho**: KPIs (total vendido, perdido, conversão, ticket médio) + totalizadores
  - **Relatório por vendedor**: tabela agrupada por vendedor com métricas individuais
  - **Relatório por canal**: tabela agrupada por canal com contagem e valor total
- Botão "Gerar PDF" que abre uma nova janela com o conteúdo formatado para impressão
- Logo da empresa no cabeçalho do relatório
- Data de geração e filtros aplicados no cabeçalho

### 2. Atualizar `src/components/Header.tsx`
- Adicionar item de navegação "Relatórios" com ícone `FileText` apontando para `/relatorios`

### 3. Atualizar `src/App.tsx`
- Adicionar rota `/relatorios` dentro do layout autenticado

## Detalhes da geração PDF

Ao clicar "Gerar PDF", será criada uma nova janela (`window.open`) com HTML formatado incluindo:
- Cabeçalho com logo e título do relatório
- Filtros aplicados (período, funil, vendedor)
- Tabelas/dados do relatório selecionado
- Estilos inline otimizados para impressão
- Chamada automática a `window.print()`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/Reports.tsx` | Criar (novo) |
| `src/components/Header.tsx` | Adicionar nav item |
| `src/App.tsx` | Adicionar rota |

