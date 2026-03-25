

# Correção: Negociações Desaparecem ao Renomear Colunas

## Problema Identificado

A negociação foi criada com status "Teste", mas depois a coluna foi renomeada para "Lead". O campo `status` dos deals armazena o **nome** da coluna, e quando a coluna é renomeada, os deals existentes mantêm o status antigo. Como o Kanban filtra `deals.filter(d => d.status === col.name)`, os deals com status antigo desaparecem.

## Solucao

Duas correções:

1. **`src/components/FunnelColumnList.tsx`** -- No `handleUpdateName`, ao renomear uma coluna, atualizar tambem todos os deals que possuem o status antigo para o novo nome.

2. **Corrigir dados existentes** -- Atualizar via insert tool o deal orfao que ficou com status "Teste" para "Lead".

## Detalhes Tecnicos

No `handleUpdateName`, apos atualizar o nome da coluna, executar:
```typescript
await supabase.from("deals")
  .update({ status: newName })
  .eq("status", oldName)
  .eq("funnel_id", funnelId);
```

Isso garante que renomear uma coluna nunca mais cause deals orfaos.

| Acao | Arquivo/Recurso |
|------|-----------------|
| Editar | `src/components/FunnelColumnList.tsx` -- atualizar deals ao renomear coluna |
| Update dados | Deal com status "Teste" para "Lead" via insert tool |

