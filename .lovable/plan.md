

# Melhorias Visuais nas Colunas do Kanban

## Resumo

Refinar o header das colunas com tons mais escuros, texto branco maior, montante em destaque e coluna mais larga.

## Alterações em `src/components/KanbanColumn.tsx`

### 1. Header com tom mais escuro
- Criar função `darkenHex` que escurece a cor da coluna em ~20-25% para usar no header
- Header da coluna terá `backgroundColor` com a cor escurecida, criando contraste com o corpo da coluna

### 2. Título branco e maior
- `h3`: de `text-sm text-foreground` para `text-lg text-white font-bold`
- Remover o dot colorido (redundante com fundo sólido)
- Badge de contagem: fundo `rgba(255,255,255,0.2)`, texto branco

### 3. Montante em destaque no header
- Mover o valor total para a mesma linha ou logo abaixo do título
- Estilo: `text-base font-bold text-white` (maior e mais visível)
- Mostrar sempre (mesmo se zero, exibir "R$ 0,00")

### 4. Largura da coluna
- De `w-72` (288px) para `w-80` (320px)

### Layout do header resultante
```text
┌─────────────────────────── (cor escurecida) ──┐
│  Prospecção  [3]                         [+]  │
│  R$ 45.000,00                                 │
└───────────────────────────────────────────────┘
│  (corpo da coluna com cor sólida normal)      │
```

### Botão "+" 
- Estilo atualizado para `text-white hover:bg-white/20`

