

# Corrigir RLS de INSERT na tabela deals para admins

## Problema

A politica de INSERT da tabela `deals` exige que o usuario autenticado seja dono do funil OU membro do funil. Administradores (como Luan Pescador) nao sao donos nem membros do funil "Vendas", entao o INSERT e bloqueado pelo RLS.

A politica atual:
```
auth.uid() = user_id
AND (funnel_id IS NULL OR user owns funnel OR user is funnel member)
```

Falta a verificacao de admin, que ja existe nas politicas de SELECT e UPDATE.

## Solucao

Uma unica migracao SQL para substituir a politica de INSERT, adicionando `has_role(auth.uid(), 'admin')` como condicao alternativa:

```sql
DROP POLICY "Users can create deals in accessible funnels" ON public.deals;

CREATE POLICY "Users can create deals in accessible funnels" ON public.deals
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR funnel_id IS NULL
    OR EXISTS (SELECT 1 FROM funnels f WHERE f.id = deals.funnel_id AND f.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid())
  )
);
```

Nenhuma alteracao de codigo necessaria.

## Arquivo afetado

| Arquivo | Acao |
|---|---|
| Migracao SQL | Atualizar politica INSERT da tabela deals |

