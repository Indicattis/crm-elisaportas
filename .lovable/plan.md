

# Agrupar Botões do Header em Menu Dropdown

## Alteração em `src/components/Header.tsx`

Substituir os 3 botões separados (Perfil, Tema, Sair) por um único `DropdownMenu` com trigger de ícone de usuário (Avatar):

- **Trigger**: Botão redondo com ícone `User` (mesmo estilo atual)
- **Menu items**:
  1. **Meu Perfil** — ícone `User`, navega para `/profile`
  2. **Tema Claro/Escuro** — ícone `Sun`/`Moon`, chama `toggleTheme`
  3. Separador
  4. **Sair** — ícone `LogOut`, chama `handleLogout`, estilo destructive

- Manter o `NotificationBell` fora do dropdown (continua separado)
- Importar `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` de `@/components/ui/dropdown-menu`

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/Header.tsx` | Substituir 3 botões por DropdownMenu |

