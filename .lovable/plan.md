

# Mostrar apenas tarefas da coluna atual da negociação

## Comportamento desejado

Quando uma negociação muda para outra coluna do funil, as tarefas pendentes do grupo de tarefas da coluna anterior devem ser removidas. Apenas tarefas do grupo associado à nova coluna ficam ativas. Tarefas concluídas são preservadas (histórico).

## Estado atual

A função `handle_deal_tasks_on_status_change` (migration mais recente `20260421142234`) **não apaga** tarefas ao mudar de coluna — apenas insere novas se ainda não existirem. Isso faz com que tarefas das colunas anteriores fiquem acumuladas na negociação. (Uma versão anterior, `20260421134115`, chegou a apagar pendentes; foi revertido.)

## Mudança

### Nova migration SQL — atualizar `handle_deal_tasks_on_status_change`

Restaurar a remoção de tarefas pendentes ao mudar de status, mantendo as concluídas:

```sql
IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
  DELETE FROM public.deal_tasks
  WHERE deal_id = NEW.id
    AND completed = false;
END IF;
```

E remover o `IF EXISTS … CONTINUE` que pula inserção de templates já existentes — depois do DELETE, todos devem ser inseridos. Manter a lógica de inserção atual (templates + recurring_days).

### Ajuste em `recreate_deal_tasks` (botão "Recarregar tarefas")

Já apaga pendentes antes de recriar (na versão `20260421134115`). A versão mais recente removeu esse DELETE — restaurar:

```sql
DELETE FROM public.deal_tasks WHERE deal_id = _deal_id AND completed = false;
```

## Pontos de atenção

- **Tarefas concluídas permanecem** para preservar histórico de execução em colunas anteriores.
- **Tarefas personalizadas adicionadas manualmente** (sem `template_id`) também serão removidas se estiverem pendentes ao mudar de coluna — alinhado com a regra "só tarefas da coluna atual".
- O trigger `prevent_task_uncomplete` continua válido — DELETE não dispara `BEFORE UPDATE`.
- Frontend (`DealDetailView`) não precisa de mudanças — ele já lista tarefas do deal direto do banco; com o DELETE no trigger, só verá as da coluna atual + concluídas históricas.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| Nova migration SQL | `CREATE OR REPLACE FUNCTION handle_deal_tasks_on_status_change` com DELETE de pendentes ao mudar status; remover guard de "template já existente". `recreate_deal_tasks` também apaga pendentes antes de recriar. |

