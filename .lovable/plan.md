

# Corrigir RLS policy de funnels (bug na referência)

## Problema

A policy SELECT da tabela `funnels` tem um bug: a condição usa `fm.funnel_id = fm.id` (compara duas colunas da mesma tabela `funnel_members`) quando deveria ser `fm.funnel_id = funnels.id`. Por isso, o EXISTS nunca retorna true e vendedores não veem nenhum funil mesmo estando vinculados.

## Solução

Uma migration para dropar e recriar a policy com a referência correta:

```sql
DROP POLICY "Users can view accessible funnels" ON public.funnels;
CREATE POLICY "Users can view accessible funnels" ON public.funnels
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.funnel_members fm
      WHERE fm.funnel_id = funnels.id AND fm.user_id = auth.uid()
    )
  );
```

Também verificar e corrigir as policies de `deal_tags` e `deal_comments` para que membros do funil possam visualizar tags e comentários dos deals aos quais têm acesso (atualmente restrito a `deals.user_id = auth.uid()`).

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| Migration SQL | Corrigir policy SELECT de funnels, deal_tags e deal_comments |

