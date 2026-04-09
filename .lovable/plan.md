

# Adicionar ordenação por valor nas etapas do funil

## Alterações

### 1. `src/components/FunnelColumnList.tsx`
- Adicionar duas novas opções no `<Select>` de ordenação:
  - `value_desc` → "Maior valor"
  - `value_asc` → "Menor valor"

### 2. `src/components/KanbanBoard.tsx`
- Na lógica de `.sort()` (linha ~599), adicionar dois novos casos:
  - `value_desc`: ordenar por `deal.deal_value` decrescente (maior primeiro), tratando `null`/`undefined` como 0
  - `value_asc`: ordenar por `deal.deal_value` crescente (menor primeiro)

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/FunnelColumnList.tsx` | Adicionar opções "Maior valor" e "Menor valor" no select |
| `src/components/KanbanBoard.tsx` | Adicionar lógica de sort por valor |

