

# Modal de Troca de Senha no Primeiro Login

## Visão geral

Adicionar coluna `must_change_password` na tabela `profiles` (default `true`) e exibir um modal obrigatório de troca de senha no `AuthGuard` quando o valor for `true`. Após trocar, atualiza o flag para `false`.

## 1. Migração SQL

```sql
ALTER TABLE public.profiles ADD COLUMN must_change_password boolean NOT NULL DEFAULT true;

-- Usuários existentes já trocaram senha, então marcar como false
UPDATE public.profiles SET must_change_password = false;
```

## 2. Novo componente `src/components/ChangePasswordModal.tsx`

- Dialog modal não-dispensável (sem botão de fechar, `onOpenChange` bloqueado)
- Campos: Nova Senha + Confirmar Senha (mínimo 6 caracteres)
- Ao confirmar:
  1. `supabase.auth.updateUser({ password })`
  2. `supabase.from("profiles").update({ must_change_password: false }).eq("id", userId)`
  3. Toast de sucesso e fechar modal

## 3. Alterar `src/components/AuthGuard.tsx`

- Após obter session, consultar `profiles.must_change_password` para o usuário logado
- Se `true`, renderizar `<ChangePasswordModal />` por cima do conteúdo (bloqueando interação)
- Após troca bem-sucedida, atualizar estado local e liberar acesso

## Fluxo do admin ao convidar usuários

Quando o admin convida um novo usuário (via `invite-user`), o perfil é criado automaticamente com `must_change_password = true`. No primeiro login, o modal aparece obrigatoriamente.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `must_change_password` |
| `src/components/ChangePasswordModal.tsx` | Novo componente (modal de troca) |
| `src/components/AuthGuard.tsx` | Verificar flag e exibir modal |

