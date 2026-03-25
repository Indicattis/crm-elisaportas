

# Adicionar Avatar do Comentarista nos Comentários

## Resumo

Exibir a foto de perfil (da tabela `profiles`) ao lado de cada comentário no modal de detalhes do deal.

## Alterações

### 1. `src/components/DealDetailDialog.tsx`

- Alterar `DealComment` para incluir dados do perfil (avatar_url, full_name)
- No `fetchComments`, fazer join com `profiles`: `.select("*, profiles(full_name, avatar_url)")` usando o campo `user_id`
- Antes de cada comentário, renderizar um `Avatar` com `AvatarImage` (foto) e `AvatarFallback` (iniciais do nome)
- Importar `Avatar, AvatarImage, AvatarFallback` de `@/components/ui/avatar`

### Layout do comentário

```text
┌──────────────────────────────────────┐
│ [👤]  Texto do comentário...         │
│       25/03/2026 às 14:17    [🗑️]   │
└──────────────────────────────────────┘
```

O avatar fica à esquerda (h-8 w-8), o conteúdo ao centro, e o botão de excluir à direita.

### Nota técnica

O join `profiles(full_name, avatar_url)` funciona via `user_id` referenciando `auth.users(id)`, e `profiles.id` também referencia `auth.users(id)`. Como não há FK direta entre `deal_comments.user_id` e `profiles.id`, será necessário buscar os perfis separadamente com os `user_id`s dos comentários, ou criar uma view/FK. A abordagem mais simples: buscar comentários normalmente, coletar os `user_id`s únicos, e fazer uma query separada em `profiles` para montar um mapa `userId → profile`.

