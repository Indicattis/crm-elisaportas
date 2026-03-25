

# Header responsivo para mobile

## Alterações em `src/components/Header.tsx`

### Layout

- **Desktop (md+):** Manter o grid de 3 colunas atual (logo | nav | ações)
- **Mobile (<md):** Duas linhas:
  - Linha 1: Logo à esquerda, botões tema/logout à direita
  - Linha 2: Navegação centralizada como barra fixa no rodapé da tela (bottom nav)

### Detalhes

1. **Header principal:** Trocar `grid grid-cols-3` por `flex justify-between` com `flex-wrap`. Reduzir padding para `px-4 py-2` no mobile.

2. **Navegação mobile:** Mover a `<nav>` para uma barra fixa no bottom (`fixed bottom-0`) em telas menores que `md`. Mostrar apenas ícones (sem labels) no mobile. Em desktop, manter inline no header como está.

3. **Botão logout:** Esconder o texto "Sair" no mobile, manter só o ícone.

4. **Logo:** Reduzir altura para `h-8` no mobile (`h-8 md:h-11`).

### Estrutura mobile

```text
┌──────────────────────────┐
│ [Logo]    [🌙] [🚪]      │  ← header fixo top
└──────────────────────────┘

         (conteúdo)

┌──────────────────────────┐
│   📊      👥      ⚙️     │  ← nav fixa bottom
└──────────────────────────┘
```

### Usar `useIsMobile` hook

Importar o hook existente `useIsMobile` para renderizar condicionalmente a nav no bottom ou inline.

