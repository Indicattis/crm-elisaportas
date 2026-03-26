

# Evitar recarregamento do Header entre páginas

## Problema

Cada rota tem seu próprio `<AuthGuard>` que cria um novo `<RoleProvider>` a cada navegação. O `<Header>` está duplicado dentro de cada página. Isso causa remontagem completa do header (incluindo re-fetch de role) a cada troca de rota.

## Solução

Criar um layout compartilhado que renderiza `AuthGuard`, `RoleProvider` e `Header` uma única vez, com as páginas renderizadas dentro via `<Outlet />`.

## Alterações

### 1. Criar `src/components/AppLayout.tsx`

- Componente que renderiza `<Header />` + `<Outlet />` (do react-router)
- O header fica montado uma única vez e nunca recarrega entre rotas

### 2. Atualizar `src/App.tsx`

- Envolver as rotas autenticadas em uma rota pai com `AuthGuard` + `AppLayout`
- Usar rotas aninhadas com `<Outlet />`

```text
<Route element={<AuthGuard><AppLayout /></AuthGuard>}>
  <Route path="/" element={<Index />} />
  <Route path="/clients" element={<Clients />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/crm-config" element={<RoleGuard ...><CrmConfig /></RoleGuard>} />
</Route>
```

### 3. Remover `<Header />` de cada página

- Remover import e uso de `<Header />` em: `Index.tsx`, `Clients.tsx`, `CrmConfig.tsx`, `Profile.tsx`

### 4. Mover `RoleProvider` para dentro do `AuthGuard` (já está lá)

- Nenhuma mudança necessária, já funciona corretamente

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/AppLayout.tsx` | Criar (Header + Outlet) |
| `src/App.tsx` | Reestruturar rotas com layout pai |
| `src/pages/Index.tsx` | Remover Header |
| `src/pages/Clients.tsx` | Remover Header |
| `src/pages/CrmConfig.tsx` | Remover Header |
| `src/pages/Profile.tsx` | Remover Header |

