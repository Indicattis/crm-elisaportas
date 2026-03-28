

# Delegar Negociações (Admin)

## Visão geral

Adicionar um botão "Delegar" no dialog de detalhes da negociação, visível apenas para administradores, que permite atribuir a negociação a qualquer membro do funil. Registra o evento no histórico e notifica o novo responsável.

## Implementação em `src/components/DealDetailDialog.tsx`

1. **Botão "Delegar"**: Visível quando `role === 'admin'`. Abre um popover/select com a lista de membros do funil (buscar de `funnel_members` + `profiles`).

2. **Selecionar responsável**: Select com nome e avatar dos membros disponíveis. Ao selecionar:
   - `UPDATE deals SET assigned_to = selectedUserId WHERE id = deal.id`
   - Registrar no `deal_history`: evento `"delegation"`, descrição `"Delegou para [nome]"`
   - Notificar o novo responsável via `createNotification`
   - Toast de confirmação e `onUpdated()`

3. **Posição**: Ao lado do botão "Sair da negociação" no footer, com ícone `ArrowRightLeft` ou `UserPlus`

## Lógica de busca de membros

- Buscar `funnel_members` do funil atual + `profiles` para nomes/avatars
- Incluir também o dono do funil (`funnels.user_id`)
- Filtrar o usuário atualmente atribuído (não faz sentido delegar para quem já é responsável)

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Botão "Delegar" com select de membros (admin only) |

