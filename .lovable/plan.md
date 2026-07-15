## Objetivo

Cada negociação marcada como "Vendido" terá uma **data de referência da venda** (independente de `updated_at`), definida pelo vendedor no momento da venda e editável em `/vendas`. A listagem/filtros de `/vendas` passam a usar essa data.

## Mudanças

### 1. Banco de dados (migração)
- Adicionar coluna `sold_at timestamptz` em `public.deals`.
- Backfill: para deals com `status = 'Vendido'`, setar `sold_at = updated_at`.
- (Sem alteração de RLS — as políticas existentes já cobrem edição do deal.)

### 2. Marcar como vendido — coleta da data
Fluxos hoje que movem para "Vendido":
- Botão "Vender" no `DealCard.tsx` (quando `show_sell_button` está habilitado na coluna).
- Drag & drop para a coluna final em `KanbanBoard.tsx`.
- Mudança de status manual dentro do `DealDetailView.tsx`.

Em todos os três, ao detectar transição para status "Vendido", abrir um pequeno diálogo (`SellDateDialog`) com um date picker (padrão = hoje, `pt-BR`) exigindo confirmação. Ao confirmar, o update do deal inclui `status = 'Vendido'` e `sold_at = <data escolhida>`. Se cancelar, a mudança de status é abortada (no drag, o card retorna à coluna original).

Componente novo: `src/components/SellDateDialog.tsx` (Dialog + Calendar shadcn, reutilizado pelos três pontos).

### 3. Página `/vendas` (`src/pages/Sales.tsx`)
- Trocar a query de listagem para filtrar por `sold_at` em vez de `updated_at`:
  - `.gte("sold_at", fromISO).lte("sold_at", toISO)`
  - `.order("sold_at", { ascending: false })`
  - `COALESCE`-style fallback não é necessário graças ao backfill.
- Na linha de cada venda, substituir o timestamp exibido (hoje `updated_at`) por `sold_at`, com um ícone de lápis pequeno para editar.
- Ao clicar em editar: popover com `Calendar` (padrão shadcn) que salva `sold_at` no deal e recarrega a lista. Disponível para admin e para o próprio vendedor do deal (RLS já garante).

### 4. Tipos
Após a migração, `Tables<"deals">` regenera automaticamente com `sold_at`. Nenhum ajuste manual em `types.ts`.

## Detalhes técnicos

- SQL:
  ```sql
  ALTER TABLE public.deals ADD COLUMN sold_at timestamptz;
  UPDATE public.deals SET sold_at = updated_at WHERE status = 'Vendido' AND sold_at IS NULL;
  CREATE INDEX IF NOT EXISTS deals_sold_at_idx ON public.deals (sold_at);
  ```
- Detecção "virou vendido": comparar `oldStatus !== 'Vendido' && newStatus === 'Vendido'`.
- Ao mudar de "Vendido" para outro status, manter `sold_at` (histórico) — não limpar. Se voltar a "Vendido" depois, pedir a data novamente e sobrescrever.
- Formato exibido: `dd/MM/yy` (ptBR), consistente com o resto de `/vendas`.

## Fora de escopo
- Relatórios (`/relatorios`) e Dashboard continuam com suas datas atuais; podemos migrar depois se desejado.
