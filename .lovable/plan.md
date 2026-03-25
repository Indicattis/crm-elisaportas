

# Redesign do Header - Menu Centralizado e Visual Detalhado

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│  [Logo]          [Kanban] [Clientes] [Config]        [Sair]  │
│  left            ← centralizado no header →          right   │
└──────────────────────────────────────────────────────────────┘
```

Usar CSS grid com 3 colunas (`grid-cols-3`) para alinhar logo a esquerda, nav ao centro e logout a direita.

## Melhorias Visuais

- **Header maior** com mais padding vertical e uma borda inferior mais definida
- **Nav items** com estilo pill/tab: fundo arredondado, transicao suave, indicador ativo com underline ou fundo accent mais forte
- **Icones** ligeiramente maiores (h-5 w-5) e com spacing melhor
- **Logo** com leve drop-shadow para destaque
- **Botao Sair** com estilo outline sutil e hover vermelho
- **Separador visual** (linha ou gradient) entre header e conteudo

## Arquivo

| Acao | Arquivo |
|------|---------|
| Editar | `src/components/Header.tsx` - novo layout grid + estilos refinados |

