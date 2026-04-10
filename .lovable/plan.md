

# Mover configurações de coluna para uma Sidebar (Sheet)

## Visão geral

Cada linha de coluna no funil atualmente exibe todas as configurações inline (checkboxes, selects, popover). A proposta é simplificar a linha, mantendo apenas nome, cor, setas de posição e delete, e adicionar um botão de engrenagem que abre um `Sheet` lateral com todas as configurações da coluna selecionada.

## Alterações

### `src/components/FunnelColumnList.tsx`

1. **Importar** `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` de `@/components/ui/sheet`
2. **Adicionar estado** `editingColumnId` para controlar qual coluna está com o sheet aberto
3. **Linha da coluna**: manter apenas setas, cor, nome, botão de engrenagem (`Settings` icon) e botão de excluir
4. **Sheet lateral**: ao clicar na engrenagem, abre um Sheet com:
   - Checkbox "Coluna de aviso" + textarea do texto (se ativado)
   - Checkbox "Bolas coloridas" (se não for aviso)
   - Select "Grupo de tarefas" (se não for aviso)
   - Select "Ordenação" (se não for aviso)
   - Checkboxes "Ações permitidas" (se não for aviso)

A lógica e handlers existentes permanecem iguais, apenas muda onde os controles são renderizados.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/FunnelColumnList.tsx` | Refatorar UI: linha simplificada + Sheet com configurações |

