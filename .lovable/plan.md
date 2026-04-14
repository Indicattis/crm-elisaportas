

# Alterar foto de perfil dos colaboradores na Equipe

## Visão geral

Adicionar um botão de upload de foto no avatar de cada membro da equipe no `TeamManager`, permitindo que o admin altere a foto de perfil de qualquer colaborador diretamente na seção Equipe do `/crm-config`.

## Alterações

### `src/components/TeamManager.tsx`

- Adicionar um `<input type="file" accept="image/*">` oculto (ref) para cada membro
- No avatar de cada membro, adicionar overlay com ícone de câmera (igual ao `Profile.tsx`) que ao clicar abre o file picker
- Implementar função `handleAvatarChange(memberId, file)` que:
  1. Faz upload para o bucket `avatars` no path `{memberId}/avatar.{ext}` com `upsert: true`
  2. Obtém a URL pública
  3. Atualiza `profiles.avatar_url` do membro
  4. Recarrega a lista de membros
- Mostrar estado de loading (spinner) durante o upload no avatar do membro sendo atualizado

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/TeamManager.tsx` | Adicionar upload de avatar por membro |

