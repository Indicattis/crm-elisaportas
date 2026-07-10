## Objetivo
Ao mover um card entre colunas, preservar a bola colorida quando ela estiver **verde** ou **amarela**. Vermelho continua seguindo as regras da coluna de destino.

## Causa atual
A cor diária fica salva por dia na tabela `deal_daily_color` e não é apagada ao trocar de coluna. Mas em `src/components/DealCard.tsx`, quando a cor salva não está na lista `daily_colors` permitida da nova coluna, o componente faz fallback para a primeira cor permitida — normalmente vermelho — dando a impressão de reset.

## Mudança
Alterar apenas a lógica de fallback em `src/components/DealCard.tsx`:

- Se a cor efetiva do card for `green` ou `yellow`, exibir sempre essa cor, mesmo que a coluna atual não a inclua em `daily_colors`.
- Se for `red` (ou indefinida), manter o comportamento atual (respeita `allowedDailyColors` e cai para a primeira permitida).

Nenhuma alteração em banco, triggers ou lógica de drag-and-drop — a cor já persiste, o ajuste é somente na renderização.

## Fora do escopo
- Não alterar como a cor é definida (tarefa concluída → verde continua igual).
- Não mudar a configuração de `daily_colors` por coluna em `/crm-config`.