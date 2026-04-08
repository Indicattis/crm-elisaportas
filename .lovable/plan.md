

# Corrigir Historico por Etapa nao retornando dados

## Problema

Duas causas impedem o historico de aparecer:

1. **RLS da tabela `deal_history`**: A politica de SELECT exige que o usuario seja dono do deal (`d.user_id = auth.uid()`) OU membro do funil. Nao ha excecao para admins. Assim, um admin que nao e dono nem membro do funil nao ve nenhum registro de historico.

2. **Codigo ja filtra por role** (linha ~139): `if (role !== "admin" && deal.assigned_to !== currentUserId) continue;` — isso esta correto, mas so funciona se os dados chegarem do banco.

## Solucao

### 1. Migracao SQL — Adicionar excecao de admin na RLS de deal_history (SELECT)

Atualizar a politica de SELECT para incluir admins:

```sql
DROP POLICY "Users can view accessible deal_history" ON deal_history;

CREATE POLICY "Users can view accessible deal_history"
ON deal_history FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_history.deal_id
    AND (d.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
    ))
  )
);
```

Nenhuma alteracao de codigo necessaria — o `fetchStageHistory` ja funciona corretamente, so precisa receber os dados do banco.

## Arquivo afetado

| Arquivo | Acao |
|---|---|
| Migracao SQL | Atualizar RLS SELECT de `deal_history` para incluir admins |

