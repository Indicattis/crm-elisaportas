## Objetivo

Em `/crm-config`, dentro das configurações de cada coluna do funil, adicionar a opção "Botão de vender no card":
- **Não** (padrão): comportamento atual, sem botão no card.
- **Sim**: cada card daquela coluna passa a mostrar um botão de "Vender" que, ao ser clicado, marca a negociação como vendida imediatamente (aparece em `/vendas`), sem precisar abrir o card.

## Passos

### 1. Banco de dados
- Adicionar coluna `show_sell_button boolean NOT NULL DEFAULT false` em `public.funnel_columns`.

### 2. Configuração (/crm-config)
- Em `src/components/FunnelColumnList.tsx`, dentro do Sheet de configurações da coluna (bloco "deals"/"contacts"), adicionar um toggle "Botão de vender no card" com ícone verde (ex.: `CheckCircle2`).
- Novo handler `handleUpdateShowSellButton(colId, boolean)` que grava `show_sell_button` na coluna.

### 3. Kanban
- `src/components/KanbanBoard.tsx`: já carrega `funnel_columns`; propagar um mapa `showSellButtonMap: Record<columnName, boolean>` para as colunas.
- Passar a flag para `KanbanColumn` → `DealCard`. Criar handler `handleQuickSell(dealId)` que:
  - Descobre a última coluna do funil (mesma lógica de `handleMarkAsSold` já existente em `DealDetailView`: `statuses[statuses.length - 1]`).
  - Faz `update` em `deals` setando `status` para essa última coluna.
  - Atualiza otimista/refetch para o card sumir da coluna atual.
  - Toast "Negociação marcada como vendida!".

### 4. Card
- `src/components/DealCard.tsx`: quando `showSellButton === true`, renderizar um botão compacto verde ("Vender", ícone `CheckCircle2`) numa nova linha discreta no final do card. `onClick` chama `onQuickSell(deal.id)` com `stopPropagation` para não abrir o card nem iniciar drag.

### 5. Detalhes técnicos
- A rota `/vendas` já filtra `status = "Vendido"`, mantendo compatibilidade com o comportamento existente do botão "Vendido" já presente em `DealDetailView`.
- Nenhuma alteração de RLS: usa a mesma política de `UPDATE` da tabela `deals` já existente.
- Nenhum arquivo auto-gerado é tocado.

## Arquivos afetados
- Migração SQL (nova coluna).
- `src/components/FunnelColumnList.tsx`
- `src/components/KanbanBoard.tsx`
- `src/components/KanbanColumn.tsx`
- `src/components/DealCard.tsx`
