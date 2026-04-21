

# Bloquear conclusão de tarefas vencidas há mais de 1 dia

## Objetivo

No modal de detalhes da negociação, impedir que o usuário marque uma tarefa como concluída se já passou **mais de 1 dia** da `deadline_at`. A tarefa fica visualmente travada (checkbox desabilitado) com um indicador de "Expirada".

## Regra

Para cada tarefa pendente (`completed = false`):

- `now() <= deadline_at` → editável normalmente (pode concluir)
- `now() > deadline_at` e `now() <= deadline_at + 24h` → ainda editável (janela de tolerância de 1 dia para concluir em atraso)
- `now() > deadline_at + 24h` → **travada**: checkbox desabilitado, card com aparência de bloqueado (opacidade reduzida + ícone de cadeado), tooltip "Tarefa expirada — não pode mais ser concluída"

Tarefas já concluídas (`completed = true`) permanecem inalteradas, independente da data.

## Mudanças

### Front-end (`src/components/DealDetailDialog.tsx`)

- Criar helper `isTaskLocked(task)`: retorna `true` se `!task.completed && now > deadline_at + 24h`.
- No render de cada card de tarefa (dentro dos blocos por etapa e "Sem etapa"):
  - Aplicar `opacity-60 pointer-events-none` no conteúdo principal quando travada (mantendo o card visível).
  - Desabilitar o `Checkbox`/botão de marcar concluída (`disabled={isTaskLocked(task)}`).
  - Adicionar `<Tooltip>` com texto "Tarefa expirada há mais de 1 dia — não pode ser concluída".
  - Mostrar pequeno badge "Expirada" ao lado do prazo, em `text-destructive`.
- O handler `toggleTaskCompletion` faz `if (isTaskLocked(task)) return;` no início como guarda extra.

### Back-end (nova migration SQL)

Trigger `BEFORE UPDATE` em `deal_tasks` para impedir conclusão tardia mesmo via API direta:

```sql
CREATE OR REPLACE FUNCTION public.prevent_late_task_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.completed = true 
     AND OLD.completed = false 
     AND now() > OLD.deadline_at + interval '1 day' THEN
    RAISE EXCEPTION 'Tarefa expirada há mais de 1 dia não pode ser concluída';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER prevent_late_task_completion_trigger
BEFORE UPDATE ON public.deal_tasks
FOR EACH ROW EXECUTE FUNCTION public.prevent_late_task_completion();
```

Tarefas recorrentes geradas automaticamente continuam funcionando (o trigger só bloqueia a transição `false → true` quando vencidas).

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/components/DealDetailDialog.tsx` | Helper `isTaskLocked`, UI travada com tooltip + badge "Expirada", guarda em `toggleTaskCompletion` |
| Nova migration SQL | Função + trigger `prevent_late_task_completion` em `deal_tasks` |

