## Diagnóstico

Ao criar uma negociação a partir de um contato, o `CreateDealFromContactDialog` chama `onCreated` que atualmente aciona apenas `fetchContacts()` dentro do `ContactsColumn`. Ou seja, apenas a lista de contatos é recarregada — o Kanban (deals) não é notificado, então o novo card não aparece na coluna de destino até um refresh manual da página.

Além disso, o `ContactsColumn` já expõe um prop `onChanged?` no seu tipo, mas ele não está sendo passado pelo `KanbanBoard` e não é chamado após criar a negociação.

## Correção

1. **`src/components/ContactsColumn.tsx`**
   - No `CreateDealFromContactDialog`, alterar `onCreated` para além de `fetchContacts()`, disparar `props.onChanged?.()` avisando o Kanban que houve mudança.

2. **`src/components/KanbanBoard.tsx`**
   - Onde `<ContactsColumn ... />` é renderizado (linha ~914), passar `onChanged={fetchDeals}` (ou o refetcher equivalente já usado para recarregar os cards do Kanban) para que a nova negociação apareça imediatamente na coluna correspondente.

## Resultado esperado

Após clicar em "Criar negociação" no card do contato e confirmar, o novo card passa a aparecer na coluna do funil escolhido sem precisar recarregar a página.