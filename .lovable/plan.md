

# Corrigir visibilidade de funis para Administradores

## Problema

A política RLS da tabela `funnels` para SELECT só permite ver funis onde `user_id = auth.uid()` ou onde o usuário é membro (`funnel_members`). Administradores não têm acesso especial, então só veem funis que eles mesmos criaram ou dos quais são membros.

## Correção — Migração SQL

Atualizar a política SELECT para incluir admins:

```sql
DROP POLICY IF EXISTS "Users can view accessible funnels" ON public.funnels;

CREATE POLICY "Users can view accessible funnels" ON public.funnels
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM funnel_members fm
    WHERE fm.funnel_id = funnels.id AND fm.user_id = auth.uid()
  )
);
```

Isso permite que qualquer usuário com role `admin` veja todos os funis.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| Migração SQL | Atualizar política RLS de SELECT na tabela `funnels` |

