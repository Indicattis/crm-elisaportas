

# Justificativa ao Arquivar Negociação

## Visão geral

Adicionar um campo `archive_reason` na tabela `deals` e exigir uma justificativa (texto livre) antes de arquivar uma negociação, seguindo o mesmo padrão do fluxo de "Perdida" que já usa um dialog de confirmação.

## Alterações

### 1. Migração SQL
- Adicionar coluna `archive_reason TEXT` (nullable) na tabela `deals`

### 2. `src/components/DealDetailDialog.tsx`
- Adicionar estado `showArchiveReasonDialog` (boolean) e `archiveReason` (string)
- No botão "Arquivar": em vez de arquivar diretamente, abrir o dialog de justificativa
- Criar dialog similar ao de "Motivo da perda" mas com um `Textarea` para texto livre
- No "Confirmar": fazer update com `{ archived: true, archive_reason: archiveReason }`
- Ao "Desarquivar": limpar o `archive_reason` (setar null)

### 3. Exibir a justificativa
- Na página `/results`, na tab/filtro de Arquivadas, exibir a coluna `archive_reason` na tabela (similar a como `loss_reason` aparece nas Perdidas)

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `archive_reason` em `deals` |
| `src/components/DealDetailDialog.tsx` | Dialog de justificativa ao arquivar |
| `src/pages/Results.tsx` | Exibir motivo do arquivamento na tabela |

