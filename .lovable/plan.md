

# Mostrar Montante Total por Coluna no Kanban

## O que muda

Cada coluna do Kanban passa a exibir, ao lado do contador de deals, o valor total (soma) de todas as negociações daquela coluna.

## Implementação

**Arquivo: `src/components/KanbanColumn.tsx`**

- Calcular `totalValue` somando `deal.value` de todos os deals da coluna
- Exibir abaixo do título da coluna (ou ao lado do badge de contagem) o valor formatado em R$ usando `toLocaleString("pt-BR")`
- Mostrar apenas se `totalValue > 0`
- Estilo: texto pequeno (`text-xs`) com cor `text-muted-foreground` e ícone de cifra

```text
┌─────────────────────────────┐
│ 🟣 Proposta Enviada  [3]   │
│    R$ 45.000,00             │
│ ┌─────────────────────────┐ │
│ │ Deal card...            │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

