

# Etapas de Negociação por Grupo de Tarefas

## Visão geral

Cada grupo de tarefas poderá ter etapas (padrão: 3) com nome e cor configuráveis. As tarefas do grupo serão vinculadas a uma etapa. No modal da negociação, as tarefas aparecerão agrupadas por etapa, na ordem definida, para que o vendedor trabalhe sequencialmente.

## Alterações

### 1. Banco de dados — nova tabela e coluna

**Nova tabela `task_group_stages`:**

| Coluna | Tipo | Padrão |
|---|---|---|
| id | uuid | gen_random_uuid() |
| group_id | uuid | (ref task_groups) |
| name | text | — |
| color | text | '#22c55e' |
| position | integer | 0 |
| user_id | uuid | — |
| created_at | timestamptz | now() |

RLS: admins podem gerenciar, autenticados podem visualizar.

**Nova coluna em `task_templates`:**
- `stage_id uuid` (nullable, referência a task_group_stages)

**Criação automática de 3 etapas padrão:** ao criar um novo grupo, inserir automaticamente:
1. "Etapa 1" — verde (#22c55e)
2. "Etapa 2" — amarelo (#eab308)
3. "Etapa 3" — vermelho (#ef4444)

### 2. `src/components/TaskGroupManager.tsx`

- Buscar etapas junto com grupos e templates
- Dentro de cada card de grupo, exibir seção de etapas (lista com nome, cor editável e botões de adicionar/remover)
- No dialog de criar/editar tarefa, adicionar select para escolher a etapa
- Cada tarefa na listagem mostra um badge colorido com o nome da etapa

### 3. `src/components/DealDetailDialog.tsx`

- Buscar as etapas do grupo de tarefas vinculado à coluna atual (via template_id → stage_id)
- Agrupar as tarefas por etapa na sidebar
- Renderizar separadores visuais com nome e cor da etapa entre os grupos de tarefas
- Tarefas sem etapa aparecem ao final

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `task_group_stages`, adicionar `stage_id` em `task_templates` |
| `src/components/TaskGroupManager.tsx` | UI de etapas + select de etapa no dialog de tarefa |
| `src/components/DealDetailDialog.tsx` | Agrupar tarefas por etapa na sidebar |
| `src/lib/deal-tasks.ts` | Incluir `stage_id` ao criar deal tasks a partir de templates |

