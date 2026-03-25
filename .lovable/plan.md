

# Cards Brancos com Destaque de Tag + Modal com Cor da Coluna

## Resumo

Duas mudanças: (1) cards voltam ao fundo branco, mantendo borda colorida da tag; (2) ao abrir o modal de detalhes, o header usa a cor da coluna onde o deal está.

## Alterações

### 1. `src/components/DealCard.tsx` — Card branco

- Remover `backgroundColor: primaryTag ? primaryTag.color : undefined` do style
- Manter apenas `borderLeftColor` com a cor da tag (borda esquerda colorida como destaque)
- Remover classes condicionais de `text-white` — voltar a usar `text-foreground`, `text-muted-foreground`, `text-primary` padrão
- Background padrão via classe: `bg-background` (branco/escuro conforme tema)

### 2. `src/components/KanbanBoard.tsx` — Passar cor da coluna ao abrir modal

- Ao chamar `handleViewDeal`, identificar a coluna do deal pelo `deal.status` e pegar a `color` correspondente
- Criar novo estado `viewingColumnColor` para armazenar a cor
- Passar `columnColor` como nova prop ao `DealDetailDialog`

### 3. `src/components/DealDetailDialog.tsx` — Header colorido

- Receber nova prop `columnColor?: string`
- Aplicar `backgroundColor` e `text-white` no `DialogHeader` quando `columnColor` estiver presente
- Ajustar padding e border-radius para encaixar no topo do dialog

### Layout resultante

```text
Card no Kanban:
┌──┬────────────────────┐
│▌ │ Título do Deal     │  ← borda esquerda colorida (tag)
│▌ │ Cliente • R$ 1.000 │  ← fundo branco
│▌ │ [Tag1] [Tag2]      │
└──┴────────────────────┘

Modal ao clicar:
┌─────────────────────────────┐
│  ██ Header com cor coluna █ │  ← backgroundColor = cor da coluna
│  Título do Deal             │
│  Status: Prospecção         │
├─────────────────────────────┤
│  Conteúdo normal...         │
└─────────────────────────────┘
```

