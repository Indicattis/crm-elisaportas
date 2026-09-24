# Gráfico por status em Relatórios

## Alteração
- Substituir a linha única de quantidade de leads por uma linha separada para cada status existente.
- Manter a linha de valor fechado baseada nas negociações vendidas e na data de referência da venda.
- Tornar cada item da legenda clicável para ocultar ou exibir sua linha no gráfico.
- Aplicar o mesmo estado visual ao gráfico incluído no PDF.

## Detalhes técnicos
- Gerar as séries dinamicamente a partir dos status carregados no período e dos filtros ativos.
- Usar cores distintas e legíveis para cada status.
- Preservar os filtros atuais de período, funil, vendedor e canal.
