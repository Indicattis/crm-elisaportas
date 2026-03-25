

# Funcionalidade de Captura de Negociação

## Resumo

Adicionar campo `assigned_to` na tabela `deals` para registrar o vendedor responsável. No card do Kanban, exibir avatar do responsável ou botão de captura. No header do modal de detalhes, exibir a foto do responsável.

## 1. Migração de banco de dados

Adicionar coluna `assigned_to` (uuid, nullable) na tabela `deals`:

```sql
ALTER TABLE public.deals ADD COLUMN assigned_to uuid;
```

## 2. Alterações em `DealCard.tsx`

- Receber nova prop `assignedProfile` com `{ avatar_url, full_name }` e prop `onCapture`
- No rodapé do card (ao lado do valor), exibir:
  - Se `deal.assigned_to` existe: Avatar pequeno (h-6 w-6) com foto do responsável
  - Se não existe: botão de captura (ícone `UserPlus`, h-6 w-6) que chama `onCapture(deal.id)` ao clicar

## 3. Alterações em `KanbanBoard.tsx`

- Buscar profiles dos responsáveis (fetch profiles dos `assigned_to` dos deals)
- Manter um `profilesMap` com os dados dos responsáveis
- Implementar `handleCapture(dealId)`: atualiza `assigned_to` com `auth.uid()` via Supabase e refaz fetch
- Passar `assignedProfile` e `onCapture` para cada `DealCard`

## 4. Alterações em `KanbanColumn.tsx`

- Repassar as novas props (`assignedProfile`/`onCapture`) para os `DealCard`s

## 5. Alterações em `DealDetailDialog.tsx`

- Buscar o profile do responsável quando o deal tem `assigned_to`
- No header, ao lado do título/status, exibir Avatar do responsável com nome
- Se não tiver responsável, mostrar botão "Capturar" no header

