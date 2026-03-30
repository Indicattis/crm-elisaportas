

# Resetar Senha de Usuário (Admin)

## Visão geral

Adicionar botão "Resetar senha" na lista de membros da equipe (apenas para outros usuários, não para si mesmo). A nova senha segue a fórmula: **primeira letra do nome + sobrenome**, tudo em minúsculas (ex: "João Silva" → `jsilva`). Após o reset, marca `must_change_password = true` para forçar troca no próximo login.

## 1. Edge Function `invite-user/index.ts` — Adicionar ação de reset

Expandir a edge function para aceitar uma ação `reset_password`:
- Recebe `{ action: "reset_password", user_id, full_name }`
- Calcula a senha: primeira letra do primeiro nome + último sobrenome, tudo minúsculo e sem acentos
- Usa `adminClient.auth.admin.updateUserById(user_id, { password })` para resetar
- Atualiza `profiles.must_change_password = true`
- Retorna a senha temporária gerada

A lógica existente de convite continua funcionando normalmente (quando `action` não é enviado).

## 2. `src/components/TeamManager.tsx` — Botão de reset

- Adicionar ícone `KeyRound` do lucide-react ao lado do botão de remover membro
- Ao clicar: confirmação com `confirm("Resetar a senha de X?")`
- Chamar a edge function com `action: "reset_password"`
- Exibir dialog/toast com a nova senha temporária para o admin compartilhar

## Fórmula da senha

```
"João Pedro Silva" → "jsilva"
"Maria Santos" → "msantos"
"Ana" → "ana" (se só tem um nome, usa o nome inteiro)
```

Remover acentos (normalize + replace).

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/invite-user/index.ts` | Adicionar ação `reset_password` |
| `src/components/TeamManager.tsx` | Botão de resetar senha + exibir senha temporária |

