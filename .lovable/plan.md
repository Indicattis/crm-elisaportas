

# Sistema de Notificações

## Visão geral

Criar uma tabela `notifications` no banco, disparar notificações nos 4 eventos selecionados, e exibir um ícone de sino no header com dropdown listando as notificações com marcação de lida/não lida.

## 1. Banco de dados — Nova tabela `notifications`

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deal_id uuid,
  type text NOT NULL, -- 'task_overdue', 'column_change', 'comment', 'deal_assigned'
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Allow authenticated inserts (for in-app creation)
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

## 2. Disparos de notificação (client-side)

Inserir notificações nos pontos existentes do código:

| Evento | Arquivo | Onde |
|---|---|---|
| **Negociação atribuída** | `KanbanBoard.tsx` | `handleCapture` — notificar o usuário atribuído |
| **Coluna movida** | `KanbanBoard.tsx` | `handleDragEnd` — notificar `assigned_to` da deal |
| **Comentário** | `DealDetailDialog.tsx` | Ao criar comentário — notificar `assigned_to` e `user_id` da deal (exceto autor) |
| **Tarefa vencida** | `DealDetailDialog.tsx` | Ao carregar tarefas, verificar vencidas e criar notificação (com dedup por deal_task.id) |

## 3. Componente `NotificationBell` no Header

- Ícone `Bell` com badge vermelho mostrando contagem de não lidas
- Dropdown (Popover) com lista de notificações, ordenadas por `created_at` desc
- Cada item: ícone por tipo, título, mensagem, tempo relativo, indicador de não lida
- Botão "Marcar todas como lidas"
- Clique em notificação: marca como lida e navega para a deal (abre modal ou rota)
- Realtime subscription para atualizar em tempo real

## 4. Helper `src/lib/notifications.ts`

Função utilitária para criar notificação:
```typescript
export async function createNotification(params: {
  userId: string;
  dealId?: string;
  type: string;
  title: string;
  message: string;
}) { ... }
```

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `notifications` com RLS e realtime |
| `src/lib/notifications.ts` | Criar helper de criação de notificação |
| `src/components/NotificationBell.tsx` | Criar componente sino + dropdown |
| `src/components/Header.tsx` | Integrar NotificationBell |
| `src/components/KanbanBoard.tsx` | Disparar notificações em capture e drag |
| `src/components/DealDetailDialog.tsx` | Disparar notificações em comentários e tarefas vencidas |

