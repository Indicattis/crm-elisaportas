

# Código Numérico Sequencial para Negociações

## 1. Migração SQL

Adicionar coluna `deal_number` com sequência automática:

```sql
-- Criar sequência
CREATE SEQUENCE public.deals_deal_number_seq START 1;

-- Adicionar coluna com valor padrão da sequência
ALTER TABLE public.deals ADD COLUMN deal_number integer UNIQUE DEFAULT nextval('public.deals_deal_number_seq');

-- Preencher deals existentes (por ordem de criação)
UPDATE public.deals SET deal_number = sub.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM public.deals) sub
WHERE deals.id = sub.id;

-- Ajustar sequência para continuar após o maior valor
SELECT setval('public.deals_deal_number_seq', COALESCE((SELECT MAX(deal_number) FROM public.deals), 0));
```

Novos deals recebem automaticamente o próximo número sequencial.

## 2. Exibir código nos componentes

### `src/components/DealCard.tsx`
- Exibir `#${deal.deal_number}` ao lado do título no card

### `src/components/DealDetailDialog.tsx`
- Exibir `#${deal.deal_number}` no header do dialog (ao lado do título)

### `src/components/DealsListView.tsx`
- Adicionar coluna "Cód." na tabela com o `deal_number`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar sequência e coluna `deal_number` |
| `src/components/DealCard.tsx` | Exibir código no card |
| `src/components/DealDetailDialog.tsx` | Exibir código no header |
| `src/components/DealsListView.tsx` | Coluna de código na tabela |

