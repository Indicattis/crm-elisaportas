

# Grupos de Tarefas com Agenda Recorrente por Dias

## Objetivo

Permitir criar um Grupo de Tarefas onde você define **em quais dias após o cadastro/movimentação** da negociação as tarefas devem ser criadas — incluindo a opção "todos os dias até o dia X".

## Comportamento

Ao marcar um grupo como "Agenda recorrente", em vez de listar tarefas individuais com prazo, você define:

1. **Tipo da tarefa** (Mensagem / Ligação / Personalizada com descrição)
2. **Modo da agenda**:
   - **Dias específicos**: lista de dias (ex.: 1, 3, 5, 7, 14)
   - **Todos os dias até o dia X**: gera 1, 2, 3, …, X
3. **Hora do dia** opcional (default 09:00) para o prazo de cada tarefa

Quando uma negociação entra em uma coluna vinculada a esse grupo, o sistema cria automaticamente uma tarefa para cada dia configurado, com prazo em `data_entrada + N dias` (na hora escolhida). Ao mover/recadastrar, as tarefas pendentes são removidas e recriadas (mesma lógica do trigger atual).

## Mudanças no Banco

**Nova coluna em `task_groups`**:
- `schedule_mode` text — `"manual"` (padrão atual) ou `"recurring_days"`
- `schedule_days` int[] — lista de offsets em dias (ex.: `{1,3,5,7}`)
- `schedule_time` time — horário do dia (default `09:00`)
- `schedule_task_type` text — `"mensagem" | "ligacao" | "personalizada"`
- `schedule_task_description` text — descrição (quando personalizada)

**Atualizar `handle_deal_tasks_on_status_change` e `recreate_deal_tasks`**:
- Se `schedule_mode = 'recurring_days'`, ignorar `task_templates` e gerar uma tarefa por dia em `schedule_days`, com `deadline_at = date_trunc('day', now()) + (dia * interval '1 day') + schedule_time`.
- Se `manual`, manter o comportamento atual.

## Mudanças na UI (`src/components/TaskGroupManager.tsx`)

No card de cada grupo, adicionar um **Switch "Agenda recorrente"**. Quando ativado:

- Esconde a seção de Tarefas/Etapas individuais.
- Mostra um formulário com:
  - Select do tipo da tarefa
  - Campo de descrição (se personalizada)
  - Toggle entre "Dias específicos" e "Todos os dias até"
    - Dias específicos: input para adicionar dias (chips removíveis)
    - Todos os dias até: input numérico (gera array `[1..N]`)
  - Input de hora (time picker)
- Botão "Salvar agenda" persiste as colunas em `task_groups`.

Quando desativado, volta ao fluxo manual atual com templates.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| Nova migration SQL | Adicionar colunas em `task_groups` + atualizar 2 funções (`handle_deal_tasks_on_status_change`, `recreate_deal_tasks`) |
| `src/components/TaskGroupManager.tsx` | UI condicional de "Agenda recorrente" no card do grupo |

