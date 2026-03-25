

# Sistema de Usuários com Cargos (Admin/Vendedor)

## Visão geral

Adicionar gestão de equipe completa: o admin pode convidar novos usuários e atribuir cargos. Vendedores terão acesso restrito apenas ao Kanban e Clientes.

## 1. Banco de dados — Migrações

### 1a. Tabela `user_roles`

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 1b. Função `has_role` (security definer, evita recursão RLS)

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 1c. Função auxiliar `get_my_role`

```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;
```

### 1d. RLS em `user_roles`

- SELECT: admins veem tudo; usuários veem seu próprio registro
- INSERT/UPDATE/DELETE: somente admins

```sql
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### 1e. Trigger: primeiro usuário vira admin automaticamente

```sql
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();
```

## 2. Edge Function — Convidar usuário

Criar `supabase/functions/invite-user/index.ts`:
- Recebe `{ email, role, full_name }`
- Usa service role key para criar o usuário via `supabase.auth.admin.createUser`
- Insere o cargo na tabela `user_roles`
- Retorna sucesso ou erro
- Apenas admins podem chamar (verifica via `get_my_role`)

## 3. Componente `TeamManager.tsx` — Reformular

Dividir em duas seções:

### 3a. Meu perfil (manter como está)
Card com avatar, nome, email do usuário logado.

### 3b. Lista de membros da equipe (novo, somente para admins)
- Buscar todos os profiles + seus roles via join
- Exibir lista com avatar, nome, email, cargo (badge)
- Botão "Convidar membro" abre dialog com campos: Nome, Email, Cargo (select: Admin/Vendedor)
- Ao submeter, chama a edge function `invite-user`
- Admin pode alterar cargo de outros membros
- Admin pode remover membros

## 4. Controle de acesso nas rotas — `AuthGuard.tsx`

- Buscar o role do usuário logado via `get_my_role()` ao autenticar
- Passar o role via context (React Context) para toda a app
- Criar `RoleContext` com hook `useUserRole()`

## 5. Restrição de rotas no `App.tsx`

- `/crm-config`: somente `admin`
- `/` (Kanban) e `/clients`: ambos os cargos
- Se vendedor tentar acessar `/crm-config`, redirecionar para `/`

## 6. Header — esconder "Configurações" para vendedores

Filtrar `navItems` com base no role: vendedores não veem o link de Configurações.

## Resumo dos arquivos alterados/criados

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabela `user_roles`, funções, trigger, RLS |
| `supabase/functions/invite-user/index.ts` | Criar edge function |
| `src/contexts/RoleContext.tsx` | Criar context de role |
| `src/components/AuthGuard.tsx` | Adicionar fetch de role + provider |
| `src/components/TeamManager.tsx` | Adicionar lista de equipe + convite |
| `src/components/Header.tsx` | Filtrar nav por role |
| `src/App.tsx` | Proteger rota `/crm-config` por role |

