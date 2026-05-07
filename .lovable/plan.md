## Permitir transferir leads sem desativar usuário

Hoje na gestão de equipe (/crm-config) o botão "Transferir leads e desativar" sempre desativa a conta do usuário origem. A solicitação é poder apenas transferir, mantendo o usuário ativo.

### Mudanças

**`src/components/TeamManager.tsx`**
- Adicionar estado `transferOnly` (boolean) controlado por um Checkbox no diálogo de transferência: "Apenas transferir (manter usuário ativo)".
- Ajustar `handleTransfer`:
  - Quando `transferOnly` for `true`, enviar `skip_deactivation: true` para a edge function `transfer-and-deactivate` (a função já suporta esse parâmetro e, nesse caso, não banirá o usuário).
  - Atualizar mensagem de confirmação e toast de sucesso para refletir o modo (sem desativação) — sem mencionar remoção de papel/membership.
- O título e o texto do diálogo passam a se adaptar a três estados: órfão, transferir e desativar, ou apenas transferir.
- Botão final muda label para "Transferir" (variant default) quando `transferOnly` estiver marcado.

**`supabase/functions/transfer-and-deactivate/index.ts`**
- Atualmente, mesmo com `skip_deactivation`, a função remove `funnel_members` e `user_roles` do usuário origem, o que efetivamente o desativa.
- Ajuste: quando `skip_deactivation === true`, **não** apagar `user_roles` nem remover as `funnel_members` do usuário origem (manter o vínculo). Apenas transferir os deals (e adicionar destinatário aos funis necessários, como já faz).

### Observações
- Nenhuma migração de banco necessária.
- Comportamento atual de "Transferir e desativar" continua disponível como opção padrão.
