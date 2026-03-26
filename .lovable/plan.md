

# Recorrência de Tarefas Automáticas

## Visão geral

Permitir que templates de tarefa tenham configuração de recorrência. Quando uma tarefa recorrente é concluída, uma nova tarefa do mesmo template é criada automaticamente (enquanto a negociação permanecer na coluna vinculada ao grupo). Três modos de recorrência: intervalo de tempo (a cada N horas/dias), dia da semana (ex: toda segunda) ou dia do mês (ex: todo dia 15).

## Banco de dados

### Migration: adicionar colunas de recorrência em `task_templates`

```sql
ALTER TABLE task_templates
  ADD COLUMN recurrence_type text DEFAULT null,
  ADD COLUMN recurrence_value integer DEFAULT null;
```

- `recurrence_type`: `'interval'` | `'weekday'` | `'monthday'` | `null` (sem recorrência)
- `recurrence_value`:
  - Para `interval`: número de horas entre recriações
  - Para `weekday`: 0-6 (domingo=0, segunda=1, ..., sábado=6)
  - Para `monthday`: 1-31 (dia do mês)

### Migration: adicionar campo `next_recurrence_at` em `deal_tasks`

```sql
ALTER TABLE deal_tasks
  ADD COLUMN next_recurrence_at timestamptz DEFAULT null;
```

Quando a tarefa é criada a partir de um template recorrente, calcula-se a próxima data de recriação e armazena aqui para referência.

## Edge Function: `process-recurring-tasks`

Uma edge function agendada via `pg_cron` (a cada 15 minutos) que:

1. Busca todos os `deal_tasks` onde `completed = true` e o template associado tem `recurrence_type IS NOT NULL`
2. Para cada tarefa concluída, verifica se a negociação ainda está na coluna vinculada ao grupo do template
3. Verifica se já existe uma tarefa pendente para o mesmo `template_id` + `deal_id` (evita duplicatas)
4. Se a condição de recorrência foi atingida (intervalo passou, dia da semana/mês correto), cria nova tarefa com novo `deadline_at`

## Frontend: Configuração no `TaskGroupManager`

### Dialog de tarefa — novos campos

Adicionar ao dialog de criação/edição de template:

- **Switch** "Recorrente" → ativa/desativa recorrência
- Quando ativo, **Select** com tipo: "Intervalo de tempo", "Dia da semana", "Dia do mês"
  - **Intervalo**: input numérico + select horas/dias (reutiliza padrão existente)
  - **Dia da semana**: select com Domingo a Sábado
  - **Dia do mês**: input numérico 1-31
- Exibir badge "Recorrente" nos templates que têm recorrência configurada

### Exibição no `DealDetailDialog`

- Tarefas recorrentes exibem um ícone de "repeat" (🔄) ao lado do tipo, indicando que serão recriadas automaticamente.

## Lógica de recriação (na edge function)

```text
Para cada deal_task concluída com template recorrente:
  1. Checar se deal.status == coluna do grupo (deal ainda na etapa)
  2. Checar se não existe deal_task pendente com mesmo template_id + deal_id
  3. Calcular se deve recriar:
     - interval: completed_at + recurrence_value horas <= now
     - weekday: hoje é o dia da semana configurado
     - monthday: hoje é o dia do mês configurado
  4. Se sim: INSERT nova deal_task com deadline = now + deadline_hours
```

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Adicionar `recurrence_type`, `recurrence_value` em `task_templates`; `next_recurrence_at` em `deal_tasks` |
| `supabase/functions/process-recurring-tasks/index.ts` | Criar edge function para processar recorrência |
| Cron job (SQL insert) | Agendar execução a cada 15 min |
| `src/components/TaskGroupManager.tsx` | Adicionar campos de recorrência no dialog de template |
| `src/components/DealDetailDialog.tsx` | Exibir ícone de recorrência nas tarefas |
| `src/lib/deal-tasks.ts` | Ao criar tarefa de template recorrente, preencher `next_recurrence_at` |

