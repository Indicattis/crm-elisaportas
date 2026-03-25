

# Vincular Usuários a Funis

## Problema

As RLS policies das tabelas `funnels`, `funnel_columns` e `deals` usam `auth.uid() = user_id`, o que significa que apenas o criador (admin) consegue visualizar os funis. Vendedores não veem nenhum funil.

## Solução

Criar uma tabela de vínculo `funnel_members` e atualizar as RLS policies para que membros vinculados também possam visualizar funis, colunas e deals.

### 1. Migration: criar tabela `funnel_members` e atualizar RLS

```sql
CREATE TABLE public.funnel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, user_id)
);

ALTER TABLE public.funnel_members ENABLE ROW LEVEL SECURITY;

-- Admins gerenciam membros
CREATE POLICY "Admins can manage funnel_members"
  ON public.funnel_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Membros podem ver seus próprios vínculos
CREATE POLICY "Members can view own memberships"
  ON public.funnel_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

Atualizar as policies de SELECT nas tabelas `funnels`, `funnel_columns` e `deals` para incluir membros:

```sql
-- funnels: owner OU membro
DROP POLICY "Users can view their own funnels" ON public.funnels;
CREATE POLICY "Users can view accessible funnels" ON public.funnels
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.funnel_members fm WHERE fm.funnel_id = id AND fm.user_id = auth.uid())
  );

-- funnel_columns: owner OU membro do funil
DROP POLICY "Users can view their own funnel_columns" ON public.funnel_columns;
CREATE POLICY "Users can view accessible funnel_columns" ON public.funnel_columns
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.funnel_members fm WHERE fm.funnel_id = funnel_columns.funnel_id AND fm.user_id = auth.uid())
  );

-- deals: owner OU membro do funil
DROP POLICY "Users can view their own deals" ON public.deals;
CREATE POLICY "Users can view accessible deals" ON public.deals
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid())
  );

-- deals: membros também podem atualizar (mover cards, capturar)
DROP POLICY "Users can update their own deals" ON public.deals;
CREATE POLICY "Users can update accessible deals" ON public.deals
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid())
  );

-- deals: membros podem criar deals no funil
DROP POLICY "Users can create their own deals" ON public.deals;
CREATE POLICY "Users can create deals in accessible funnels" ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      funnel_id IS NULL
      OR EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_id AND f.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid())
    )
  );
```

### 2. Adicionar gestão de membros na configuração do funil (`CrmConfig.tsx`)

- Na seção de funis, ao selecionar um funil, mostrar uma lista dos membros (vendedores) vinculados
- Botão para adicionar/remover membros usando os perfis existentes da equipe
- Buscar perfis da tabela `profiles` + `user_roles` para listar vendedores disponíveis

### 3. Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar `funnel_members`, atualizar RLS de funnels/funnel_columns/deals |
| `src/components/CrmConfig.tsx` ou novo componente `FunnelMembersManager.tsx` | UI para vincular vendedores aos funis |

