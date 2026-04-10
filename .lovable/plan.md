

# Botão de alternância de ordenação pessoal no header da coluna Kanban

## Visão geral

Adicionar um botão no header de cada coluna do Kanban que permite ao usuário logado alternar entre a **ordem padrão** (configurada pelo admin via `sort_order` da coluna) e a **ordem de cadastro** (`created_at`). Essa preferência é local ao usuário (armazenada em `localStorage`), não afeta os demais.

## Alterações

### 1. `src/components/KanbanBoard.tsx`

- Criar state `userSortOverrides: Record<string, boolean>` (coluna → true = usar `created_at`, false = usar padrão). Inicializar a partir de `localStorage`.
- Passar callback `onToggleSort` e prop `isCreatedAtSort` para cada `KanbanColumn`.
- Na lógica de `.sort()`, verificar se existe override do usuário para a coluna antes de usar `sort_order` do banco.
- Persistir no `localStorage` com chave como `kanban_sort_overrides`.

### 2. `src/components/KanbanColumn.tsx`

- Aceitar novas props: `isCreatedAtSort?: boolean` e `onToggleSort?: () => void`.
- No header (ao lado do botão `+`), renderizar um botão com ícone `ArrowUpDown` (ou `ArrowDownAZ` / `Clock`) que alterna a ordenação.
- Tooltip ou visual sutil indicando o modo ativo.

## Detalhes técnicos

| Item | Detalhe |
|---|---|
| Persistência | `localStorage` por usuário (sem tabela nova) |
| Chave localStorage | `kanban_sort_overrides_{userId}` |
| Ícone | `ArrowUpDown` do lucide-react |
| Escopo | Apenas para o usuário logado, não altera config global |

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/KanbanBoard.tsx` | State + lógica de override + persistência localStorage |
| `src/components/KanbanColumn.tsx` | Botão de toggle no header |

