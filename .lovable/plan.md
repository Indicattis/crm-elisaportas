

# Corrigir inconsistencia de tempo entre Card e Modal

## Problema

O card mostra `15:45` quando a negociacao esta ha menos de 1 dia na etapa -- isso e o **horario** em que o `updated_at` foi registrado (formato HH:mm), nao o tempo decorrido. Ja o modal mostra `0h` = horas decorridas desde o `updated_at`. Sao metricas diferentes sendo exibidas no mesmo contexto.

## Solucao

Padronizar ambos para mostrar **horas decorridas** quando a negociacao esta ha menos de 1 dia na etapa.

### Alteracoes

**`src/components/DealCard.tsx`** (unica alteracao):
- Linha 182: substituir `format(new Date(deal.updated_at), "HH:mm")` por calculo de horas decorridas
- Calcular `hoursInStage = Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 3600000)`
- Exibir `{hoursInStage}h` em vez do horario do dia

Resultado: tanto o card quanto o modal mostrarao `Xh` quando a negociacao esta ha menos de 24h na etapa.

