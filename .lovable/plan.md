

# Bola Colorida de Status Diário nos Cards de Negociação

## Visão geral

Adicionar uma bola colorida brilhante (com efeito glow) em cada card de negociação. Todo dia ela começa vermelha. Ao clicar, cicla: vermelho → amarelo → verde. O estado é persistido no banco com a data, para que no dia seguinte volte a vermelho automaticamente.

## 1. Migração — Nova tabela `deal_daily_color`

```sql
CREATE TABLE public.deal_daily_color (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  color text NOT NULL DEFAULT 'red',
  date date NOT NULL DEFAULT CURRENT_DATE,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(deal_id, date)
);

ALTER TABLE public.deal_daily_color ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read deal_daily_color"
  ON public.deal_daily_color FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert deal_daily_color"
  ON public.deal_daily_color FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update deal_daily_color"
  ON public.deal_daily_color FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```

## 2. `src/components/DealCard.tsx` — Adicionar bola colorida

- Receber nova prop `dailyColor` (string: `"red"` | `"yellow"` | `"green"` | `undefined`)
- Receber callback `onColorChange(dealId: string, newColor: string)`
- Renderizar um círculo com classes de cor + animação de brilho (box-shadow glow via Tailwind `shadow` ou inline style)
- Ao clicar (com `e.stopPropagation()`), ciclar: red → yellow → green → red
- Cores: vermelho `#ef4444`, amarelo `#eab308`, verde `#22c55e` com `box-shadow: 0 0 8px <cor>`

## 3. `src/components/KanbanBoard.tsx` — Gerenciar estado das cores

- Ao carregar deals, buscar `deal_daily_color` filtrado por `date = CURRENT_DATE`
- Manter um `Map<dealId, color>` no estado
- Ao clicar na bola, fazer upsert em `deal_daily_color` (insert com ON CONFLICT update) e atualizar o estado local
- Passar `dailyColor` e `onColorChange` para cada `DealCard`

## Lógica de reset diário

Não precisa de cron. Como buscamos apenas registros com `date = CURRENT_DATE`, se não existe registro para hoje, a bola aparece vermelha (default). Simples e automático.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Nova tabela `deal_daily_color` com RLS |
| `src/components/DealCard.tsx` | Adicionar bola colorida com ciclo de cores |
| `src/components/KanbanBoard.tsx` | Fetch/upsert de cores diárias, passar props |

