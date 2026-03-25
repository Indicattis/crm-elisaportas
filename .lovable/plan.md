

# Página de Perfil com Reset de Senha

## Visão geral

Criar uma página dedicada `/profile` onde o usuário pode ver/editar seu perfil (nome, foto, email, cargo) e resetar sua senha. Remover a seção "Meu Perfil" do `TeamManager` (que fica em `/crm-config`). Adicionar botão de acesso ao perfil no Header.

## Alterações

### 1. Criar `src/pages/Profile.tsx`

Nova página com duas seções:

**Seção 1 — Meu Perfil** (extraído do `TeamManager`):
- Avatar com upload de foto
- Nome editável
- Email (somente leitura)
- Badge do cargo

**Seção 2 — Alterar Senha**:
- Campo "Nova senha" e "Confirmar nova senha"
- Botão "Alterar senha"
- Usa `supabase.auth.updateUser({ password })` para atualizar

### 2. Atualizar `src/components/TeamManager.tsx`

- Remover toda a seção "Meu Perfil" (Card com avatar, nome, email, cargo)
- Manter apenas a seção "Membros da Equipe" e o dialog de convite

### 3. Atualizar `src/App.tsx`

- Importar a página `Profile`
- Adicionar rota `/profile` protegida por `AuthGuard` (acessível por admin e vendedor)

### 4. Atualizar `src/components/Header.tsx`

- Adicionar botão/ícone de perfil (ícone `User` ou avatar do usuário) ao lado do botão de tema e logout
- Ao clicar, navega para `/profile`
- Visível para todos os usuários (não filtrado por role)

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/Profile.tsx` | Criar |
| `src/components/TeamManager.tsx` | Remover seção "Meu Perfil" |
| `src/components/Header.tsx` | Adicionar botão de perfil |
| `src/App.tsx` | Adicionar rota `/profile` |

