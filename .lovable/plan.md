

# Inverter Valor e Calor + Destaque no Valor

## Alterações em `src/components/DealCard.tsx`

### 1. Mover o valor para o rodapé (linha 130-150)
- Colocar o valor (R$) no lado direito do rodapé, onde atualmente ficam as chamas de calor
- Aplicar destaque: `text-sm font-bold text-primary` com um fundo sutil `bg-primary/10 rounded px-1.5 py-0.5`

### 2. Mover o calor (chamas) para onde estava o valor (linhas 112-117)
- As chamas ficam logo após o cliente, no lugar onde o valor estava

### 3. Remover o bloco de valor antigo (linhas 112-117) e o bloco de calor antigo (linhas 143-149)

### Layout resultante
```text
┌──┬──────────────────────────────┐
│▌ │ Título do Deal          [🏷] │
│▌ │ 👤 Cliente                   │
│▌ │ 🔥🔥🔥                       │
│▌ │ [Tag1] [Tag2]               │
│▌ │ 📅 01/01/2025  🕐 3d  R$1k  │
└──┴──────────────────────────────┘
```

O valor fica no rodapé à direita com badge destacado, e o calor sobe para o corpo do card.

