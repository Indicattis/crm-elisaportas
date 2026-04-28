# Corrigir transferência de leads ao desativar usuário

## Problema confirmado

Na negociação 697 (e em outros 51 casos):
- `user_id` = joao.staehler (admin que criou via fluxo de captação)
- `assigned_to` = Juliana (a vendedora "dona" do lead no CRM)

A função `transfer-and-deactivate` filtra apenas `WHERE user_id = from_user_id`. Como nenhum deal tinha a Juliana como `user_id`, **zero leads foram transferidos**. Mesmo assim ela foi banida e removida dos `funnel_members`, deixando 52 cards mostrando-a como responsável sem que ela consiga acessar.

No domínio do CRM:
- `user_id` = quem criou (frequentemente o admin/sistema via lead capture)
- `assigned_to` = vendedor responsável (o que aparece no card e no Kanban)

A "transferência de leads" deve operar sobre **`assigned_to`**, que é o que o usuário enxerga como "leads do vendedor".

## Correção

### Edge function `transfer-and-deactivate/index.ts`

Mudar a definição de "deals do usuário origem" para englobar **ambos**:
- `assigned_to = from_user_id` (caso principal — o vendedor responsável)
- OU `user_id = from_user_id` (caso o usuário também seja dono)

Lógica de transferência:
1. Buscar deals com `assigned_to = from_user_id OR user_id = from_user_id` (respeitando filtro de arquivado).
2. Para cada deal:
   - Se `assigned_to = from_user_id` → setar `assigned_to = to_user_id`.
   - Se `user_id = from_user_id` → setar `user_id = to_user_id`.
3. Continuar com: adicionar destino aos `funnel_members`, registrar `deal_history`, banir usuário, limpar `user_roles` e `funnel_members` do origem.

Implementação prática: dois `UPDATE` separados (um por `assigned_to`, outro por `user_id`) para evitar lógica condicional por linha; coletar a lista única de IDs afetados para o `deal_history` e para descobrir os funis envolvidos.

### Frontend `TeamManager.tsx`

Atualizar a contagem exibida no dialog "Transferir e desativar" para usar a mesma regra:
- Hoje: conta `deals` por `user_id`.
- Novo: conta `deals` onde `assigned_to = membro OR user_id = membro` (com `or()` do supabase-js), respeitando o filtro de arquivado.

Isso fará o dialog mostrar corretamente "52 negociações ativas" em vez de "0".

### Reparo retroativo (deals já órfãos da Juliana)

Como a Juliana já foi banida e ainda há 52 deals com `assigned_to = juliana`, vou expor uma forma de corrigir: após o deploy da correção, basta reabrir o dialog em outro vendedor ativo? Não — a Juliana não aparece mais na lista de membros (sem `user_roles`).

Solução: a função aceitará `from_user_id` mesmo sem `user_roles`/perfil ativo (já é o caso — só valida que existe em `profiles`). Vou recriar temporariamente o `user_roles` da Juliana? Não. Em vez disso, adicionar um caminho no `TeamManager`:

- Listar separadamente "Usuários desativados com leads pendentes" — qualquer `assigned_to` distinct em `deals` cujo `user_id` não está em `user_roles`. Para cada um, oferecer o mesmo botão "Transferir leads" (sem desativar, pois já está banido).

Para manter o escopo enxuto desta correção, vou fazer:
- A função aceita um parâmetro extra `skip_deactivation: boolean`. Quando `true`, pula o `auth.admin.updateUserById` (banimento) e a limpeza de `user_roles` (já não existe).
- O `TeamManager` ganha uma seção "Vendedores desativados com leads" listando esses casos e permitindo chamar a função com `skip_deactivation: true`.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/transfer-and-deactivate/index.ts` | Buscar deals por `assigned_to OR user_id`; atualizar ambos os campos quando aplicável; aceitar `skip_deactivation` |
| `src/components/TeamManager.tsx` | Contagem usa `assigned_to OR user_id`; nova seção "Vendedores desativados com leads pendentes" com ação de transferência |

## Pontos técnicos

- Query para listar órfãos:  
  `SELECT DISTINCT d.assigned_to, p.full_name FROM deals d JOIN profiles p ON p.id = d.assigned_to LEFT JOIN user_roles ur ON ur.user_id = d.assigned_to WHERE ur.user_id IS NULL AND d.assigned_to IS NOT NULL`
- Sem mudança de schema — apenas lógica de aplicação.
- RLS: como a função usa `service_role`, não há bloqueio.