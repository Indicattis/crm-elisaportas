

# Estilizar Colunas do Kanban com a Cor Configurada

## O que muda

Cada coluna do Kanban passará a ter um estilo visual baseado na cor definida nas configurações do funil. Atualmente a coluna só mostra um pequeno círculo colorido no header.

## Implementação

**`src/components/KanbanColumn.tsx`**

- Adicionar uma borda superior (ou lateral esquerda) com a cor da coluna usando `borderTopColor` inline
- Usar a cor como background com opacidade muito baixa (~5-10%) para dar identidade visual sem poluir
- Quando `isOver` (drag hover), intensificar levemente a opacidade do background da cor
- Manter o badge counter com a cor da coluna em vez do `bg-primary/10` genérico
- Aplicar via `style` inline já que são cores dinâmicas (não funcionam com classes Tailwind)

Estrutura visual:
```text
┌─────────────────────┐  ← border-top 3px com a cor
│  ● Status Name  [3] │  ← badge com cor da coluna
│  R$ 1.200,00        │
│                     │  ← background com cor @ 5% opacity
│  [Deal Card]        │
│  [Deal Card]        │
└─────────────────────┘
```

