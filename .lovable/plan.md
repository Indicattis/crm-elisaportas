

# Motivo de Perda + Gráfico de Perdas no Dashboard

## 1. Migração — Adicionar coluna `loss_reason` na tabela `deals`

```sql
ALTER TABLE public.deals ADD COLUMN loss_reason text;
```

Valores possíveis: `Desqualificado`, `Perca por orçamento`, `Perca por prazo`, `Perca por qualidade`, `Perca por logística`, `Perca por atendimento`.

## 2. `src/components/DealDetailDialog.tsx` — Modal de motivo ao marcar como perdida

- Ao clicar "Perdida", em vez de marcar direto, abrir um dialog/estado interno pedindo o motivo
- Exibir 6 opções como `RadioGroup` com os motivos listados
- Botão "Confirmar" executa o update com `status: "Perdida"` e `loss_reason: motivoSelecionado`
- Não permitir confirmar sem selecionar motivo

## 3. `src/pages/Dashboard.tsx` — Gráfico de pizza "Motivos de Perda"

- Novo `useMemo` filtrando deals com `status === "Perdida"` e agrupando por `loss_reason`
- Cores fixas para cada motivo (vermelho, laranja, amarelo, etc.)
- Adicionar como 4º card na grid de gráficos (mudar grid para `md:grid-cols-2 lg:grid-cols-4` ou manter 2x2)

## 4. `src/pages/Results.tsx` — Exibir motivo na aba Perdidas

- Na tabela/lista de perdidas, mostrar coluna/badge com o `loss_reason`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `loss_reason` em `deals` |
| `src/components/DealDetailDialog.tsx` | Adicionar seleção de motivo antes de marcar como perdida |
| `src/pages/Dashboard.tsx` | Adicionar gráfico de motivos de perda |
| `src/pages/Results.tsx` | Exibir motivo na listagem de perdidas |

