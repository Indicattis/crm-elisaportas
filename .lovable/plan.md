

# Múltiplas Tarefas Recorrentes por Grupo

## Objetivo

Permitir que um grupo com "Agenda recorrente" tenha **várias tarefas recorrentes** (cada uma com seu próprio tipo, descrição, dias e horário), em vez de apenas uma.

## Modelo Atual (limite de 1)

Hoje as colunas `schedule_mode`, `schedule_days`, `schedule_time`, `schedule_task_type` e `schedule_task_description` ficam direto em `task_groups` — 1 grupo = 1 agenda = 1 tarefa.

## Novo Modelo

Mover a configuração de agenda para uma nova tabela filha **`task_group_schedules`** (N tarefas por grupo). O grupo mantém apenas o flag `schedule_mode` ("manual" vs "recurring_days").

### Mudanças no banco

**Nova tabela `task_group_schedules`**:
- `id uuid pk`
- `group_id uuid` (FK lógica para `task_groups`)
- `user_id uuid`
- `task_type text` ("mensagem" | "ligacao" | "personalizada")
- `task_description text`
- `days int[]` (ex: `{1,3,5,7}`)
- `time time` (default `09:00`)
- `position int`
- `created_at timestamptz`
- RLS: admins gerenciam; autenticados visualizam (mesmo padrão de `task_templates`)

**Manter em `task_groups`**: apenas `schedule_mode`. As colunas antigas (`schedule_days`, `schedule_time`, `schedule_task_type`, `schedule_task_description`) podem ser mantidas e ignoradas, ou removidas. → Vou **migrar os dados existentes** para `task_group_schedules` e depois deixar as colunas antigas em paz (sem dropar, evita risco).

**Atualizar funções `handle_deal_tasks_on_status_change` e `recreate_deal_tasks`**:
- Quando `schedule_mode = 'recurring_days'`, em vez de ler colunas do grupo, iterar sobre todas as linhas em `task_group_schedules WHERE group_id = …` e, para cada uma, gerar uma tarefa por dia em `days`.

```sql
IF v_group.schedule_mode = 'recurring_days' THEN
  FOR v_sched IN
    SELECT task_type, task_description, days, time
    FROM public.task_group_schedules
    WHERE group_id = v_task_group_id
    ORDER BY position
  LOOP
    FOREACH v_day IN ARRAY v_sched.days LOOP
      INSERT INTO public.deal_tasks (deal_id, type, description, deadline_at)
      VALUES (NEW.id, v_sched.task_type, v_sched.task_description,
              date_trunc('day', v_now) + (v_day || ' days')::interval + v_sched.time);
    END LOOP;
  END LOOP;
  RETURN NEW;
END IF;
```

### Mudanças na UI (`src/components/TaskGroupManager.tsx`)

No card do grupo, quando `schedule_mode = 'recurring_days'`:
- Em vez de mostrar **um** resumo, listar **todas** as tarefas recorrentes do grupo, cada uma com botões de editar/excluir.
- Botão **"+ Nova tarefa recorrente"** abre o diálogo de agenda atual (tipo, descrição, dias específicos / até dia X, horário) — mas agora cria/edita uma linha em `task_group_schedules`.
- Toggle **"Agenda recorrente"** continua existindo no nível do grupo (define `schedule_mode`). Ao desativar, oculta a lista mas não apaga as linhas (preserva config).

Estado novo: `schedules: TaskGroupSchedule[]` (carregado em paralelo no `fetchData`).

Diálogo de agenda passa a operar sobre uma `editingSchedule: TaskGroupSchedule | null` em vez do grupo inteiro.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| Nova migration SQL | Criar `task_group_schedules` + RLS, migrar dados das colunas antigas, atualizar as 2 funções de trigger |
| `src/components/TaskGroupManager.tsx` | Listar N agendas por grupo; CRUD por linha em `task_group_schedules` |
| `src/integrations/supabase/types.ts` | Auto-regenerado |

