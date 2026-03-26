

# Vincular Grupos de Tarefas a Colunas de Funis + Criacao Automatica

## Visao geral

Quando uma negociacao for criada ou movida para uma coluna que tem um grupo de tarefas vinculado, as tarefas do grupo sao instanciadas automaticamente com prazos calculados. Ao mover para outra coluna, tarefas pendentes sao excluidas e novas sao criadas (se a nova coluna tiver grupo vinculado).

## Banco de dados

### Migration: 3 alteracoes

**1. Tabela `column_task_groups`** — vinculo entre colunas de funil e grupos de tarefas
- `id` uuid PK
- `column_id` uuid NOT NULL (referencia funnel_columns)
- `task_group_id` uuid NOT NULL (referencia task_groups)
- `created_at` timestamptz default now()
- UNIQUE(column_id, task_group_id)
- RLS: admins podem CRUD, authenticated podem SELECT

**2. Tabela `deal_tasks`** — instancias de tarefas criadas para cada negociacao
- `id` uuid PK
- `deal_id` uuid NOT NULL
- `template_id` uuid (referencia task_template de origem, nullable)
- `type` text NOT NULL ('mensagem', 'ligacao', 'personalizada')
- `description` text
- `deadline_at` timestamptz NOT NULL (data/hora limite calculada)
- `completed` boolean default false
- `completed_at` timestamptz
- `completed_by` uuid
- `created_at` timestamptz default now()
- RLS: mesma logica de deals (via funnel_members)

### 3. Adicionar coluna `task_group_id` na `funnel_columns` (opcional, alternativa mais simples)

Alternativa: em vez de tabela de vinculo, adicionar `task_group_id uuid` diretamente em `funnel_columns` (relacao 1:1 coluna->grupo). Isso simplifica bastante a logica.

Vou usar esta abordagem (1 grupo por coluna).

## Frontend

### 1. `FunnelColumnList.tsx` — adicionar select de grupo de tarefas em cada coluna

Na UI de configuracao de colunas, adicionar um dropdown para vincular um grupo de tarefas a cada coluna. Buscar os grupos da tabela `task_groups` e salvar o `task_group_id` na `funnel_columns`.

### 2. `KanbanBoard.tsx` — logica ao criar/mover deal

**Ao criar deal (DealDialog.onSaved):**
- Apos insert do deal, verificar se a coluna de destino tem `task_group_id`
- Se sim, buscar templates do grupo e inserir `deal_tasks` com `deadline_at = now() + deadline_hours`

**Ao mover deal (handleDragEnd):**
- Apos update do status, deletar `deal_tasks` pendentes (completed = false) do deal
- Se a nova coluna tem `task_group_id`, criar novas `deal_tasks`

### 3. Exibicao das tarefas no `DealDetailDialog`

- Adicionar secao "Tarefas" no modal de detalhes da negociacao
- Listar tarefas pendentes e concluidas com checkbox para marcar como feita
- Exibir prazo (deadline_at) com indicador de atraso se vencida

## Arquivos afetados

| Arquivo | Acao |
|---|---|
| Migration SQL | Adicionar `task_group_id` em `funnel_columns`, criar `deal_tasks` |
| `src/components/FunnelColumnList.tsx` | Adicionar select de grupo de tarefas |
| `src/components/KanbanBoard.tsx` | Logica de criacao/exclusao de tarefas ao criar/mover deals |
| `src/components/DealDetailDialog.tsx` | Exibir e gerenciar tarefas do deal |
| `src/components/DealDialog.tsx` | Apos criar deal, instanciar tarefas |

