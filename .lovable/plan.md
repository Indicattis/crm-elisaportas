

# Melhorar Layout dos Cards de Negociação

## Visão geral

Refinar o DealCard com melhor hierarquia visual, espaçamentos e tamanhos de fonte para tornar as informações mais legíveis e organizadas.

## Alterações em `src/components/DealCard.tsx`

### Estrutura proposta (3 linhas claras)

**Linha 1 — Título (destaque principal)**
- Título com `text-sm font-semibold` (manter)
- Bola de status, sino e ícone do canal com gap maior (`gap-1.5`)
- Avatar/captura à direita
- Padding do card: `px-3 py-2.5` (mais respiro)
- Space-y aumentado de `space-y-1` para `space-y-1.5`

**Linha 2 — Telefone + Heat + Tempo na etapa**
- Telefone com `text-[11px]` para ser secundário
- Heat e tempo na etapa mantidos em `text-xs`
- Separador visual mais claro entre elementos

**Linha 3 — Localização + Próxima tarefa**
- Localização em `text-[11px]` para ser terciária
- Data da tarefa em `text-[11px] font-medium`

**Linha 4 — Data de criação + Valor**
- Data de criação em `text-[11px] text-muted-foreground`
- Valor com `text-xs font-bold` e badge com padding levemente maior (`px-2 py-0.5`)

### Detalhes de refinamento
- Aumentar `rounded-lg` para `rounded-xl` para suavizar cantos
- Borda esquerda da tag mantida em 3px
- Avatar de 7→6 (h-6 w-6) para proporção melhor
- Ícones de informação de 3→3 (manter h-3 w-3)
- Hover shadow de `hover:shadow-md` para `hover:shadow-sm` (mais sutil)

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealCard.tsx` | Ajustar classes de espaçamento, fonte e hierarquia |

