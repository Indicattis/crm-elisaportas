

# Auto-atribuir ao criar + Botão "Sair da negociação"

## 1. `src/components/DealDialog.tsx` — Auto-atribuir responsável

No `handleSubmit`, ao criar (não editar), adicionar `assigned_to: user.id` no payload de insert. Assim o criador já é automaticamente o responsável.

## 2. `src/components/DealDetailDialog.tsx` — Botão "Sair da negociação"

Adicionar botão na barra de ações do footer (junto com Arquivar, Perdida, Vendido):
- Visível apenas quando `deal.assigned_to === currentUser.id`
- Ao clicar: `UPDATE deals SET assigned_to = NULL WHERE id = deal.id`
- Registrar no `deal_history`: evento `"unassign"`, descrição `"Saiu da negociação"`
- Exibir toast de confirmação e chamar `onUpdated()`
- Ícone: `UserMinus` ou `LogOut` do lucide-react

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/DealDialog.tsx` | Adicionar `assigned_to: user.id` no insert |
| `src/components/DealDetailDialog.tsx` | Botão "Sair da negociação" no footer |

