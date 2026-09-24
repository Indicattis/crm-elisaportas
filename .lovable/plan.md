# Gráfico diário em Relatórios

## Objetivo
Adicionar em `/relatorios`, na visualização de negociações, um gráfico por data com duas linhas:
- valor fechado no dia;
- quantidade de leads criados no dia.

## Comportamento
- O gráfico respeitará período, funil, vendedor, status e canal de aquisição.
- Um novo filtro de etapa permitirá escolher uma coluna específica ou todas as etapas.
- A quantidade de leads será agrupada pela data de criação.
- O valor fechado será agrupado pela data de referência da venda (`sold_at`), considerando negociações vendidas.
- Dias sem registros continuarão aparecendo com valor zero para manter a linha temporal contínua.

## PDF
- O mesmo gráfico será incluído no PDF de negociações, junto da tabela atual.
- A impressão usará uma imagem do gráfico para preservar cores e proporções.

## Detalhes técnicos
- Recharts exibirá as duas séries com eixos separados: moeda à esquerda e quantidade à direita.
- A etapa será derivada das colunas do funil e aplicada à contagem de leads pela etapa atual da negociação.
- O gráfico será convertido em imagem no navegador antes de abrir a impressão.
