

# Desqualificados: cor cinza + retornar ao Kanban

## Visão geral

O card de Desqualificados já usa tons cinza (`muted-foreground`). A mudança principal é adicionar um botão "Retornar ao Kanban" nas negociações desqualificadas, permitindo reativá-las movendo-as para a primeira etapa do funil original.

## Alterações

### `src/pages/Results.tsx`

1. **Botão "Retornar" na tabela** — Na coluna de ações (onde já existe "Excluir" para arquivadas), adicionar um botão com ícone `Undo2` para deals desqualificados. Visível quando `activeFilter === "disqualified"` ou `activeFilter === null` (para deals com status "Desqualificado").

2. **Função `handleRestoreDeal`**:
   - Buscar as colunas do funil do deal (`funnel_columns` onde `funnel_id = deal.funnel_id`, `is_notice = false`, ordenado por `position`)
   - Pegar o nome da primeira coluna (primeira etapa ativa)
   - Atualizar o deal: `status = primeiraEtapa`, `loss_reason = null`
   - Registrar no `deal_history` o evento de retorno
   - Exibir toast de sucesso e recarregar deals

3. **Coluna de ações**: Renomear de "Excluir" para "Ações" e mostrar tanto o botão de excluir (para arquivadas) quanto o de retornar (para desqualificadas). Usar `showDeleteColumn` renomeado para `showActionsColumn` que será `true` quando o filtro for `archived`, `disqualified` ou `null`.

4. **Confirmação**: Usar `AlertDialog` para confirmar o retorno, similar ao de exclusão.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/Results.tsx` | Botão retornar + lógica de reativação |

