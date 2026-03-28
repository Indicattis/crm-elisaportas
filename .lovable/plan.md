

# Corrigir atualização imediata do modal de negociação

## Problema

O `useEffect` que sincroniza o estado local do modal depende apenas de `deal?.id` e `open`. Quando uma mutação chama `onUpdated()`, o componente pai recarrega os dados e passa um novo `deal` via props, mas o modal ignora as mudanças porque o `id` não muda.

## Solução

Adicionar `deal?.updated_at` como dependência do `useEffect` principal (linha 281-294) e também re-sincronizar campos específicos (heat, phone, email) quando o `deal` prop muda. Isso garante que qualquer atualização do deal (título, valor, notas, status, tags, delegação, etc.) reflita imediatamente no modal.

## Alteração em `src/components/DealDetailDialog.tsx`

1. **Alterar dependências do useEffect principal** (linha 294):
   - De: `[deal?.id, open]`
   - Para: `[deal?.id, deal?.updated_at, open]`

2. **Adicionar useEffect de sincronização de campos locais**:
   ```typescript
   useEffect(() => {
     if (deal && open) {
       setHeat(deal.heat || 0);
       setEditPhone((deal as any).phone || "");
       setEditEmail((deal as any).email || "");
     }
   }, [deal, open]);
   ```

3. **Após mutações bem-sucedidas que não fecham o modal** (saveField, handleHeatChange, handleAddTag, handleRemoveTag, delegação), garantir que `onUpdated()` é chamado (já está, mas agora o useEffect vai reagir ao novo `deal.updated_at`).

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Ajustar dependências do useEffect e adicionar sync de campos |

