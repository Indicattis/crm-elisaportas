

# Preservar tarefas ao mover negociações entre colunas

## Objetivo

Hoje, ao mover uma negociação de uma coluna do funil para outra, todas as tarefas pendentes são **deletadas** e novas tarefas são **criadas** com base no grupo de tarefas da nova coluna. O usuário quer que:

1. Tarefas pendentes **não sejam excluídas** ao mover a negociação para outra coluna.
2. Tarefas **não sejam recriadas** se a negociação voltar a uma coluna onde já tinha sido criada antes (evitar duplicatas).

## Comportamento Novo

Ao mover uma negociação de coluna A → coluna B:

- **Tarefas pendentes existentes**: ficam intactas (não são deletadas).
- **Tarefas concluídas**: continuam intactas (já era o comportamento atual).
- **Novas tarefas da coluna B**: criadas apenas para templates/agendas cuja tarefa correspondente **ainda não existe** para essa negociação (nem pendente, nem concluída antes).
  - Para templates manuais: dedup por `template_id` em `deal_tasks` da mesma negociação.
  - Para agendas recorrentes (`recurring_days`): dedup por `(deal_id, schedule_id, deadline_at)` — uma tarefa de agenda recorrente para o dia X já criada antes não recria.

Resultado prático: na primeira vez que a negociação entra na coluna B, as tarefas dela são criadas. Se sair e voltar, nada é recriado (porque os templates/agendas dessa coluna já têm tarefa associada à negociação). E as tarefas da coluna A continuam ali até serem concluídas manualmente ou apagadas.

## Mudanças

### Back-end (nova migration SQL)

Atualizar duas funções existentes:

**1. `handle_deal_tasks_on_status_change` (trigger em `deals`)**
- Remover o bloco `DELETE FROM public.deal_tasks WHERE deal_id = NEW.id AND completed = false;`.
- No loop de `task_templates`, antes de inserir, checar:
  ```sql
  IF NOT EXISTS (
    SELECT 1 FROM public.deal_tasks
    WHERE deal_id = NEW.id AND template_id = v_template.id
  ) THEN
    INSERT ...
  END IF;
  ```
- No loop de `task_group_schedules` (modo `recurring_days`), antes do `INSERT` de cada dia, checar duplicata por `(deal_id, deadline_at, description)`:
  ```sql
  IF NOT EXISTS (
    SELECT 1 FROM public.deal_tasks
    WHERE deal_id = NEW.id
      AND deadline_at = <calculado>
      AND description IS NOT DISTINCT FROM v_sched.task_description
      AND type = v_sched.task_type
  ) THEN
    INSERT ...
  END IF;
  ```

**2. `recreate_deal_tasks(_deal_id uuid)` (RPC chamada pelo front)**
- Mesma mudança: remover o `DELETE` de pendentes e adicionar as mesmas guardas `IF NOT EXISTS` nos dois loops.
- A função passa a ter efeito de "criar tarefas faltantes" em vez de "recriar tudo".

### Front-end

Nenhuma mudança necessária. O helper `src/lib/deal-tasks.ts` continua chamando o RPC `recreate_deal_tasks`, que agora simplesmente preenche o que falta.

## Observação sobre nomenclatura

A função `recreate_deal_tasks` mantém o nome antigo para evitar quebrar chamadas existentes, mas o comportamento muda para "garantir tarefas". Se preferir renomear depois, é trivial.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| Nova migration SQL | Atualizar `handle_deal_tasks_on_status_change` e `recreate_deal_tasks`: remover `DELETE` de pendentes + dedup `IF NOT EXISTS` nos loops de templates e agendas |

