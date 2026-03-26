

# Adicionar Gerenciamento de Tarefas no CRM Config

## Visao geral

Criar um sistema de grupos de tarefas no `/crm-config` onde o admin define templates de tarefas organizados em grupos. Cada tarefa tem um tipo (Mensagem, Ligacao ou Personalizada) e um prazo relativo (ex: "2 dias apos criacao").

## Banco de dados

### Migration: criar 2 tabelas

**`task_groups`** — grupos que agrupam tarefas
- `id` uuid PK default gen_random_uuid()
- `user_id` uuid NOT NULL (criador/admin)
- `name` text NOT NULL
- `position` integer NOT NULL default 0
- `created_at` timestamptz NOT NULL default now()

**`task_templates`** — tarefas dentro de cada grupo
- `id` uuid PK default gen_random_uuid()
- `group_id` uuid NOT NULL references task_groups(id) on delete cascade
- `user_id` uuid NOT NULL
- `type` text NOT NULL default 'personalizada' (valores: 'mensagem', 'ligacao', 'personalizada')
- `description` text — descricao customizada (obrigatoria para tipo personalizada)
- `deadline_hours` integer NOT NULL default 24 — prazo em horas apos criacao
- `position` integer NOT NULL default 0
- `created_at` timestamptz NOT NULL default now()

**RLS** para ambas:
- SELECT: authenticated, `user_id = auth.uid() OR has_role(auth.uid(), 'admin')`
- INSERT/UPDATE/DELETE: authenticated, `has_role(auth.uid(), 'admin')`

## Frontend

### 1. Card "Tarefas" no CrmConfig

- Adicionar um novo card com icone `ClipboardList` no grid do menu principal
- Adicionar `"tasks"` ao tipo de `activeSection`

### 2. Novo componente `TaskGroupManager.tsx`

UI da secao de tarefas com:
- Lista de grupos existentes (accordion ou cards)
- Botao "Novo Grupo" — dialog com input de nome
- Dentro de cada grupo: lista de tarefas com tipo, descricao e prazo
- Botao "Nova Tarefa" dentro de cada grupo — dialog/form com:
  - Select de tipo: Mensagem / Ligacao / Personalizada
  - Input de descricao (visivel/obrigatorio quando tipo = personalizada)
  - Input numerico de prazo + select de unidade (horas/dias)
- Opcoes de editar/excluir em cada grupo e tarefa

### 3. Exibicao do prazo

Converter `deadline_hours` para exibicao amigavel: "2 horas", "1 dia", "3 dias", etc.

## Arquivos afetados

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar `task_groups` e `task_templates` com RLS |
| `src/components/TaskGroupManager.tsx` | Criar componente completo |
| `src/pages/CrmConfig.tsx` | Adicionar card "Tarefas" e secao `tasks` |

