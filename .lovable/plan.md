

# Corrigir Cálculo de "Tempo Total" — Usar Dias Corridos por Calendário

## Problema

O cálculo atual usa diferença em milissegundos dividida por 86400000, o que conta apenas blocos completos de 24h. Se a negociação foi criada ontem às 23h e agora são 10h, são menos de 24h → mostra "Hoje" incorretamente.

## Solução

Comparar datas por dia de calendário (ignorando hora), garantindo que "ontem" sempre seja pelo menos 1 dia.

## Alteração em `src/components/DealDetailDialog.tsx`

Substituir o cálculo na linha ~660:

```tsx
// De:
const totalDays = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24));

// Para:
const createdAt = new Date(deal.created_at);
const now = new Date();
const startOfCreated = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const totalDays = Math.round((startOfNow.getTime() - startOfCreated.getTime()) / 86400000);
```

Isso compara início do dia de criação vs início do dia atual, garantindo contagem correta por calendário.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Corrigir cálculo de dias para usar calendário |

