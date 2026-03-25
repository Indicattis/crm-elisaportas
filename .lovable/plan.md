

# Hub de Configuração + Sistema de Tags

## Resumo

Transformar `/crm-config` em hub com abas (Tabs): "Funis" (existente) e "Tags" (novo). Criar tabela `tags` e tabela de junção `deal_tags` para associar tags às negociações.

## Banco de Dados

### Nova tabela: `tags`
```sql
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
-- RLS CRUD para user_id = auth.uid()
```

### Nova tabela: `deal_tags` (junção N:N)
```sql
CREATE TABLE public.deal_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, tag_id)
);
ALTER TABLE public.deal_tags ENABLE ROW LEVEL SECURITY;
-- RLS baseado no user_id do deal via subquery
```

## Componentes

### 1. `src/pages/CrmConfig.tsx` (refatorar)
- Usar `Tabs` com duas abas: "Funis" e "Tags"
- Aba "Funis" contém o conteúdo atual (select de funil, colunas, etc.)
- Aba "Tags" renderiza novo componente `TagManager`

### 2. `src/components/TagManager.tsx` (novo)
- Lista de tags do usuário com nome e cor (badge colorido)
- Botão "Nova Tag" abre inline form com campos nome + seletor de cor
- Cada tag tem botões editar/excluir
- CRUD completo na tabela `tags`

### 3. `src/components/DealDetailDialog.tsx` (editar)
- Adicionar seção de tags entre info e comentários
- Mostrar tags associadas como badges coloridos com botão X para remover
- Popover/select para adicionar tags existentes ao deal

### 4. `src/components/DealCard.tsx` (editar)
- Mostrar badges das tags associadas ao deal (compactos)

### 5. `src/components/KanbanBoard.tsx` (editar)
- Buscar `deal_tags` + `tags` junto com os deals para exibir nos cards

## Fluxo

```text
/crm-config
  ├── Aba "Funis" → configuração existente
  └── Aba "Tags" → TagManager (CRUD de tags)

DealCard → mostra badges de tags
DealDetailDialog → adicionar/remover tags do deal
```

