

# Adicionar botão "Desqualificar" no modal da negociação

## Visão geral

Separar a ação de desqualificar da ação "Perdida". Um novo botão "Desqualificar" será exibido no rodapé do modal, disponível para administradores e o responsável pela negociação. Ao clicar, abre um dialog pedindo justificativa em texto livre. A negociação será marcada com status "Desqualificada" e a justificativa salva em `loss_reason`.

## Alterações

### 1. `src/components/DealDetailDialog.tsx`

- Adicionar estado `showDisqualifyDialog` e `disqualifyReason`
- Remover "Desqualificado" da lista `LOSS_REASONS` (já que terá botão próprio)
- Adicionar botão "Desqualificar" no rodapé, visível quando `role === "admin"` ou `deal.assigned_to === currentUserId`
- Adicionar dialog de desqualificação com `Textarea` para justificativa obrigatória
- Ao confirmar: atualizar deal com `status: "Desqualificada"` e `loss_reason: disqualifyReason`, registrar no histórico, fechar modal

### 2. `src/components/KanbanBoard.tsx`

- Verificar se o status "Desqualificada" precisa de tratamento especial na filtragem (deals desqualificadas não devem aparecer no kanban ativo, similar a "Perdida")

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Adicionar botão, dialog e lógica de desqualificação |
| `src/components/KanbanBoard.tsx` | Garantir que deals "Desqualificada" sejam filtradas como "Perdida" |

