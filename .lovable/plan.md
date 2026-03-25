

# Adicionar seção "Equipe" em /crm-config

## Resumo

Novo card "Equipe" no hub de configuração, permitindo visualizar o perfil do usuário logado e alterar sua foto via upload.

## 1. Banco de dados

### Migration: Criar tabela `profiles`
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Migration: Criar bucket de storage `avatars`
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

## 2. Componente `TeamManager.tsx`

- Busca o perfil do usuário logado da tabela `profiles` (cria se não existir via upsert)
- Exibe avatar com `Avatar`/`AvatarFallback` e nome/email
- Botão de upload de foto: `<input type="file" accept="image/*">` oculto
- Ao selecionar imagem: upload para `avatars/{user_id}/avatar.png` via Supabase Storage, atualiza `avatar_url` no `profiles`
- Campo editável para nome (`full_name`)

## 3. Alterações em `CrmConfig.tsx`

- Adicionar `"team"` ao tipo de `activeSection`
- Novo card com ícone `Users` e título "Equipe" / descrição "Gerencie seu perfil e equipe"
- Seção `activeSection === "team"` renderiza `<TeamManager />`

## Layout do card

```text
┌──────────────────────────┐
│ 👥  Equipe               │
│     Gerencie seu perfil  │
└──────────────────────────┘
```

## Layout da seção Equipe

```text
┌─────────────────────────────────┐
│  [← Voltar]                     │
│                                 │
│  ┌──────┐  João Silva           │
│  │ 📷   │  joao@email.com       │
│  │avatar│  [Alterar foto]       │
│  └──────┘  Nome: [__________]   │
│            [Salvar]             │
└─────────────────────────────────┘
```

