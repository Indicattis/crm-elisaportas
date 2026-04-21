

# Bloquear desmarcação de tarefas concluídas

## Objetivo

Uma vez marcada como concluída, a tarefa não pode mais ser desmarcada por nenhum usuário. O checkbox fica travado no estado "concluído" permanentemente.

## Regra

- Tarefa com `completed = false` → pode ser marcada como concluída (sujeita às regras já existentes de tarefa expirada >1 dia).
- Tarefa com `completed = true` → checkbox desabilitado, clique não faz nada. Sem botão de desfazer.

## Mudanças

### Front-end — `src/components/DealDetailDialog.tsx`

1. **Helper `isTaskLocked`**: além da regra de "expirada", também retorna `true` quando `task.completed === true`. Assim o checkbox fica `disabled` e o tooltip mostra "Tarefa concluída — não pode ser desmarcada".
2. **Guarda em `toggleTaskCompletion`**: no início da função, se `task.completed === true`, retorna imediatamente (sem fazer update no banco).

### Back-end (nova migration SQL)

Reforçar no banco para impedir bypass via API direta. Atualizar/criar trigger `BEFORE UPDATE` em `deal_tasks`:

```sql
CREATE OR REPLACE FUNCTION public.prevent_task_uncomplete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.completed = true AND NEW.completed = false THEN
    RAISE EXCEPTION 'Tarefas concluídas não podem ser desmarcadas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_task_uncomplete_trigger
BEFORE UPDATE ON public.deal_tasks
FOR EACH ROW EXECUTE FUNCTION public.prevent_task_uncomplete();
```

Tarefas recorrentes continuam funcionando — o trigger só bloqueia a transição `true → false`, não interfere com criação ou conclusão.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/components/DealDetailDialog.tsx` | `isTaskLocked` retorna true se concluída; `toggleTaskCompletion` aborta se já concluída; tooltip atualizado |
| Nova migration SQL | Trigger `prevent_task_uncomplete` em `deal_tasks` bloqueando transição `true → false` |

