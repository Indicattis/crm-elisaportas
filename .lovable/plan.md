

# Vendedores Veem Apenas Suas Negociações e Órfãs

## Visão geral

Alterar a política RLS de SELECT na tabela `deals` para que vendedores vejam apenas negociações atribuídas a eles ou sem responsável (órfãs). Admins continuam vendo tudo.

## 1. Migração SQL — Atualizar política de SELECT em `deals`

Dropar a política atual `Users can view accessible deals` e criar uma nova que adiciona a restrição:

```sql
DROP POLICY "Users can view accessible deals" ON public.deals;

CREATE POLICY "Users can view accessible deals" ON public.deals
FOR SELECT TO authenticated
USING (
  (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid()
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to IS NULL
    OR assigned_to = auth.uid()
  )
);
```

Lógica: mantém a verificação base de acesso ao funil, e adiciona que não-admins só veem deals onde `assigned_to` é nulo ou igual ao próprio usuário.

## 2. Sem alterações de código

A filtragem é feita inteiramente no banco via RLS — nenhum arquivo frontend precisa mudar.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| Migração SQL | Atualizar RLS SELECT em `deals` |

