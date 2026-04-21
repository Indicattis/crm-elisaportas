

# Corrigir criação de tarefa obrigatória no modal de requisitos da coluna

## Diagnóstico

No `EntryRequirementsModal.tsx`, quando uma coluna exige `field_name = 'task'`, o modal mostra o formulário de descrição + data e, ao confirmar, faz `supabase.from("deal_tasks").insert(...)`. Hoje a inserção tem 3 problemas que, combinados, resultam em "tarefa não criada":

1. **Erro silencioso**: o `await` da inserção não checa `error`. Se a RLS bloquear, ou o `prevent_late_task_completion` rejeitar (ver item 3), o usuário vê "sucesso" e nada acontece.
2. **Data perde fuso horário**: `taskDate.toISOString()` converte um `Date` que representa meia-noite **local** para UTC, gerando deadlines como `03:00 UTC do dia X` ou até `dia X-1` em horário UTC. Em alguns casos a tarefa é gravada com data de ontem.
3. **Conflito com `prevent_late_task_completion`**: como o deadline pode acabar caindo no passado (item 2), e como o novo trigger lançado recentemente bloqueia conclusões >24h após o deadline, em casos extremos a tarefa nasce já "expirada" — o que é confuso e parece "não criada" do ponto de vista do usuário, que tenta concluí-la e recebe erro.

Além disso, após `onConfirm()` o modal chama `executeDealMove` no parent, que dispara o trigger `handle_deal_tasks_on_status_change`. Como esse trigger não cria tarefas do tipo "personalizada do modal" (só dos templates da coluna), a única origem dessa tarefa é o próprio modal — então qualquer falha silenciosa lá significa "nenhuma tarefa".

## Mudanças

### Front-end — `src/components/EntryRequirementsModal.tsx`

1. **Capturar erros do insert** e exibir toast destrutivo, abortando o `onConfirm()`:
   ```ts
   const { error: taskErr } = await supabase.from("deal_tasks").insert({...}).select().single();
   if (taskErr) {
     toast({ title: "Erro ao criar tarefa", description: taskErr.message, variant: "destructive" });
     setSaving(false);
     return; // não chama onConfirm — mantém modal aberto
   }
   ```

2. **Construir o deadline preservando o horário local** (meio-dia local, para evitar drift de timezone):
   ```ts
   const localDeadline = new Date(taskDate);
   localDeadline.setHours(12, 0, 0, 0);
   // usar localDeadline.toISOString()
   ```
   Assim o deadline cai sempre no meio do dia escolhido, sem chance de virar para o dia anterior em UTC nem nascer no passado.

3. **Mesma proteção para o `update` dos campos do deal**: checar `error` e abortar com toast antes de seguir.

4. **Só chamar `onConfirm()` depois que tudo deu certo** (ordem já está, mas ficará explícito com guards).

### Back-end

Nenhuma migration necessária. As triggers atuais (`prevent_late_task_completion`, `set_green_on_task_completion`, `handle_deal_tasks_on_status_change`) continuam intactas — o problema é puramente do modal.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/components/EntryRequirementsModal.tsx` | Checar `error` no insert de `deal_tasks` e no update de `deals`, mostrar toast e abortar se falhar; construir `deadline_at` em horário local (meio-dia) em vez de `toISOString()` direto |

