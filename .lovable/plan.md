

# Coluna de Avisos no Funil

## Visão geral

Adicionar um novo tipo de coluna no funil: "coluna de aviso". Visualmente, ela aparece no Kanban como uma coluna recolhida (barra vertical fina) exibindo um texto de aviso configurável. Não aceita negociações — serve apenas como separador visual informativo entre etapas.

## Alterações

### 1. Migração SQL

Adicionar duas colunas em `funnel_columns`:

```sql
ALTER TABLE public.funnel_columns
ADD COLUMN is_notice boolean NOT NULL DEFAULT false,
ADD COLUMN notice_text text;
```

### 2. `src/components/FunnelColumnList.tsx`

- Adicionar checkbox "Coluna de aviso" por coluna
- Quando marcada, exibir campo de texto para o aviso e ocultar seletores irrelevantes (grupo de tarefas, ordenação, ações permitidas)
- Salvar `is_notice` e `notice_text` no banco

### 3. `src/components/KanbanBoard.tsx`

- Ao renderizar colunas, identificar colunas com `is_notice = true`
- Renderizar um componente de aviso em vez de `KanbanColumn` — barra vertical fina (similar ao collapsed) com o texto de aviso, sem droppable, sem deals
- Não filtrar deals para colunas de aviso (elas não têm deals)

### 4. `src/components/KanbanColumn.tsx` (ou novo componente)

- Criar renderização de "notice column": barra vertical com a cor da coluna, exibindo o texto de aviso em vertical, sem botão de adicionar, sem contagem, não droppable nem colapsável

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar `is_notice` e `notice_text` em `funnel_columns` |
| `src/components/FunnelColumnList.tsx` | UI para configurar coluna como aviso |
| `src/components/KanbanBoard.tsx` | Renderizar coluna de aviso diferenciada |
| `src/components/KanbanColumn.tsx` | Adicionar modo de renderização "notice" |

