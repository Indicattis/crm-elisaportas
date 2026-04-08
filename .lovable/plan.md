

# Corrigir Arquivamento de Negociacao

## Problema

A politica RLS de UPDATE na tabela `deals` nao inclui excecao para administradores. O usuario atual (admin) nao e dono da negociacao #43 nem membro do funil, entao o UPDATE e bloqueado silenciosamente pelo banco.

Politica atual de UPDATE:
```
(user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid()))
```

Falta: `has_role(auth.uid(), 'admin')`.

## Solucao

Uma unica migracao SQL para atualizar a politica de UPDATE da tabela `deals`:

```sql
DROP POLICY "Users can update accessible deals" ON public.deals;

CREATE POLICY "Users can update accessible deals"
ON public.deals FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM funnel_members fm
    WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid()
  )
);
```

Nenhuma alteracao de codigo necessaria.

## Arquivo afetado

| Arquivo | Acao |
|---|---|
| Migracao SQL | Adicionar `has_role(admin)` na politica UPDATE de `deals` |

