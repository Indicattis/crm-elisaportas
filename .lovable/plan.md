

# Toggle de Modo Claro/Escuro

## Resumo

Adicionar um botão toggle no Header que alterna entre modo claro e escuro, persistindo a preferência no `localStorage`.

## Implementação

### 1. Criar hook `useTheme` (`src/hooks/use-theme.tsx`)

- Estado `theme: "light" | "dark"`, inicializado a partir do `localStorage` ou preferência do sistema
- Ao mudar, adicionar/remover classe `dark` no `document.documentElement` e salvar no `localStorage`
- Exportar `{ theme, toggleTheme }`

### 2. Atualizar `src/components/Header.tsx`

- Importar `useTheme` e ícones `Sun`/`Moon` do lucide
- Adicionar botão toggle ao lado do botão "Sair" (à direita)
- Mostrar `Sun` no modo escuro, `Moon` no modo claro
- Estilo consistente com o botão de logout (rounded-full, border)

Layout do header (direita):
```text
[☀/🌙]  [Sair]
```

### 3. Garantir suporte ao dark mode

- O `tailwind.config.ts` já tem `darkMode: ["class"]` configurado
- O `index.css` já tem variáveis `.dark` definidas
- Nenhuma mudança necessária nesses arquivos

