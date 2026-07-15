## Objetivo

Criar uma nova página dedicada para negociações **vendidas**, acessível ao clicar em uma venda em `/vendas`. Nela será possível editar a data de referência da venda e visualizar o histórico completo de atendimento, sem os controles operacionais da página normal de negociação.

## Mudanças

### 1. Nova rota `/sale/:id`
- Adicionar em `src/App.tsx` a rota `/sale/:id` → novo componente `SaleDetail`.

### 2. Nova página `src/pages/SaleDetail.tsx`
Layout no mesmo padrão glassmorphism/`bg-muted/40` usado em `/vendas`, `/results` e `/relatorios`.

Seções:
- **Cabeçalho** com botão "Voltar para Vendas", nome do cliente, telefone, badge de "Vendido" e vendedor responsável.
- **Card de destaque da venda**:
  - Valor da venda (grande, com anel `ring-success/15`).
  - Data de referência da venda (`sold_at`) editável via Popover + Calendar (mesmo componente já usado em `/vendas`).
  - Data de criação e canal de aquisição.
- **Card de informações do cliente**: nome, telefone, email, cidade/estado, tags.
- **Card de histórico de atendimento**:
  - Timeline com entradas de `deal_history` (mudanças de coluna, responsável, status) ordenadas cronologicamente.
  - Comentários (`deal_comments`) intercalados.
  - Tarefas concluídas (`deal_tasks` com `completed_at`) agrupadas por etapa.
- **Card de anexos** (`deal_attachments`) — apenas visualização/download.
- **Card de observações** (campo `notes` do deal) — somente leitura.

Sem edição de campos operacionais, sem drag/coluna, sem botões de mover/arquivar/desqualificar.

### 3. Ajuste em `src/pages/Sales.tsx`
- Trocar `navigate(\`/deal/${d.id}\`)` por `navigate(\`/sale/${d.id}\`)` na linha do card (linha 279).
- Manter o Popover inline de edição de data em `/vendas` como está.

### 4. Permissões / RLS
Nenhuma alteração de banco. A página usa as tabelas já acessíveis (`deals`, `deal_history`, `deal_comments`, `deal_tasks`, `deal_attachments`) via RLS existente.

## Detalhes técnicos

- Reaproveitar utilitários já existentes: `format` de `date-fns/pt-BR`, `Calendar`, `Popover`, `Badge`, `Card` do design system.
- Atualização de `sold_at`: `supabase.from('deals').update({ sold_at }).eq('id', id)` + toast, igual ao fluxo já em `Sales.tsx`.
- Histórico: reutilizar a mesma query de `deal_history` que `DealDetailView` faz, mas renderizada em modo timeline read-only (sem ações).
- Rota mantém compatibilidade: `/deal/:id` continua funcionando para negociações não vendidas.

## Fora do escopo

- Editar valor da venda, responsável, ou outros campos do deal.
- Alterar RLS/estrutura de banco.
- Mudanças em `/relatorios` ou `/results`.