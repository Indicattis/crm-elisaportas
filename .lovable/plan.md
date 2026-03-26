

# Separar Botão de Recorrência ao Lado do Editar

## Visão geral

Mover a configuração de recorrência para um modal separado, com um botão de ícone `Repeat` ao lado do botão de editar em cada tarefa. Ao clicar, abre um dialog dedicado apenas para configurar recorrência.

## Alterações em `src/components/TaskGroupManager.tsx`

### 1. Novo estado para modal de recorrência
- `recurrenceDialogOpen` (boolean)
- `recurrenceTask` (TaskTemplate | null) — tarefa sendo configurada

### 2. Botão de recorrência na lista de tarefas (linha ~299-305)
- Adicionar botão com ícone `Repeat` entre o botão de editar e o de excluir
- Cor diferenciada se já tem recorrência ativa (ex: `text-primary` vs `text-muted-foreground`)
- Ao clicar: seta `recurrenceTask` e abre `recurrenceDialogOpen`

### 3. Novo Dialog de recorrência
- Header: "Configurar Recorrência"
- Conteúdo: reutilizar os mesmos campos que já existem no task dialog (Switch recorrente, tipo, valor)
- Botão salvar: faz update apenas dos campos `recurrence_type` e `recurrence_value` no template

### 4. Remover seção de recorrência do task dialog principal
- Remover o `Separator` e toda a seção de recorrência (linhas ~375-445) do dialog de criação/edição de tarefa
- O task dialog fica mais enxuto, focado em tipo/descrição/prazo

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/TaskGroupManager.tsx` | Separar recorrência em modal próprio com botão dedicado |

