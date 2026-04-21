

# Bola verde só por conclusão de tarefa

## Objetivo

O usuário não pode mais escolher manualmente a cor verde da bolinha de status diário do card. O ciclo manual passa a ser apenas **vermelho ↔ amarelo**. A cor verde é definida automaticamente pelo sistema quando o usuário **conclui pelo menos uma tarefa daquela negociação no dia atual**.

## Regras

Estado da bolinha (`deal_daily_color` do dia corrente, default `red`):

- **Vermelho** → clique vira **Amarelo**
- **Amarelo** → clique vira **Vermelho** (não vai mais para verde)
- **Verde** → clique vira **Vermelho** (sai do estado automático manualmente, se quiser)

Verde é atribuído **automaticamente** sempre que uma tarefa da negociação for concluída (`completed: false → true`), com data = hoje. Ao concluir, faz upsert em `deal_daily_color` com `color = 'green'` para o `deal_id` + `date = CURRENT_DATE`.

Se o usuário depois clicar para sair do verde, vai para vermelho — e se concluir outra tarefa no mesmo dia, volta para verde.

## Mudanças

### Front-end

**`src/components/DealCard.tsx`**
- Atualizar `COLOR_CYCLE` para: `{ red: "yellow", yellow: "red", green: "red" }` (remove a transição `yellow → green`).

**`src/components/DealDetailDialog.tsx`** (handler `handleToggleTask`)
- Após concluir uma tarefa com sucesso (transição `false → true`), fazer upsert:
  ```ts
  await supabase.from("deal_daily_color").upsert({
    deal_id: deal.id,
    date: new Date().toISOString().slice(0, 10),
    color: "green",
    updated_by: user.id,
  }, { onConflict: "deal_id,date" });
  ```
- Não faz nada quando desmarca uma tarefa (não reverte a cor).

### Back-end (nova migration SQL)

Como garantia (caso a tarefa seja concluída por outra via — futuro mobile, automação etc.), adicionar trigger `AFTER UPDATE` em `deal_tasks`:

```sql
CREATE OR REPLACE FUNCTION public.set_green_on_task_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid;
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    v_user := COALESCE(NEW.completed_by, auth.uid());
    INSERT INTO public.deal_daily_color (deal_id, date, color, updated_by)
    VALUES (NEW.deal_id, CURRENT_DATE, 'green', v_user)
    ON CONFLICT (deal_id, date) DO UPDATE SET color = 'green', updated_by = EXCLUDED.updated_by;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER set_green_on_task_completion_trigger
AFTER UPDATE ON public.deal_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_green_on_task_completion();
```

Pré-requisito: garantir índice único em `(deal_id, date)` em `deal_daily_color` para o `ON CONFLICT` funcionar (criar se não existir).

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/components/DealCard.tsx` | `COLOR_CYCLE` sem transição para verde (`yellow → red`, `green → red`) |
| `src/components/DealDetailDialog.tsx` | Upsert `deal_daily_color = green` ao concluir tarefa |
| Nova migration SQL | Índice único `(deal_id, date)` + função/trigger `set_green_on_task_completion` |

