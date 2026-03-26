

# Adicionar Botão "Arquivar" para Administradores

## Visão geral

Adicionar uma coluna `archived` na tabela `deals` e um botão "Arquivar" no footer do modal de detalhes, visível apenas para administradores. Negociações arquivadas ficam ocultas do Kanban por padrão.

## 1. Migração SQL

- Adicionar coluna `archived boolean NOT NULL DEFAULT false` na tabela `deals`
- Criar index parcial para queries de deals não arquivados

## 2. `src/components/DealDetailDialog.tsx`

- Importar `useUserRole` do `RoleContext`
- Adicionar botão "Arquivar" (ícone `Archive`) no footer, entre o heat e os botões Perdida/Vendido
- Visível apenas quando `role === 'admin'`
- Ao clicar: `supabase.from("deals").update({ archived: true }).eq("id", deal.id)`
- Fecha o modal e chama `onUpdated()`
- Se já arquivada, mostrar botão "Desarquivar"

## 3. `src/components/KanbanBoard.tsx`

- No `fetchDeals`, adicionar filtro `.eq("archived", false)` para ocultar deals arquivados do Kanban

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `archived` em `deals` |
| `src/components/DealDetailDialog.tsx` | Botão Arquivar/Desarquivar (admin only) |
| `src/components/KanbanBoard.tsx` | Filtrar deals arquivados |

