

# Adicionar Criação de Tarefa Manual na Sidebar

## Visão geral

Adicionar um botão "+" no header da sidebar de tarefas que expande um mini-formulário inline para o usuário criar uma tarefa personalizada diretamente na negociação.

## Alterações em `src/components/DealDetailDialog.tsx`

### 1. Novo estado
- `showNewTask` (boolean) — controla visibilidade do formulário
- `newTaskDesc` (string) — descrição da tarefa
- `newTaskType` (string) — tipo: `personalizada`, `mensagem`, `ligacao`
- `newTaskDeadlineHours` (number) — prazo em horas (default 24)

### 2. Botão "+" no header das tarefas
- Ao lado do placar pendentes/concluídas, adicionar um botão `Plus` que toggle `showNewTask`

### 3. Formulário inline (colapsável)
- Aparece abaixo do header quando `showNewTask = true`
- Campos:
  - Select para tipo (Personalizada / Mensagem / Ligação)
  - Input para descrição
  - Input numérico para prazo em horas
- Botão "Criar" que insere na tabela `deal_tasks` com:
  - `deal_id`: deal atual
  - `type`, `description`, `deadline_at` (now + hours)
  - `template_id`: null (tarefa manual)
- Após insert, chama `fetchDealTasks()` e reseta o formulário

### 4. Sem alterações de banco
A tabela `deal_tasks` já suporta todos os campos necessários. `template_id` é nullable, então tarefas manuais funcionam sem template.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Adicionar formulário de criação de tarefa na sidebar |

