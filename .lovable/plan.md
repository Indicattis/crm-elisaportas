

# Modal Detalhado de Negociação com Histórico e Calor

## Resumo

Criar um modal grande (`DealDetailDialog`) que abre ao clicar no card, substituindo o `DealDialog` de edição. O modal terá: header com título, seção de informações, seção de comentários/histórico, e footer com botão "Marcar como Vendido" e 5 ícones de fogo para definir o calor da negociação.

## Banco de Dados

### Nova tabela: `deal_comments`
Para armazenar o histórico de comentários/anotações de cada negociação.

```sql
CREATE TABLE public.deal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;
-- RLS: usuarios veem/criam seus proprios comentarios
```

### Novo campo na tabela `deals`
Adicionar coluna `heat` (integer, default 0, range 0-5) para o calor da negociação.

```sql
ALTER TABLE public.deals ADD COLUMN heat integer NOT NULL DEFAULT 0;
```

## Componentes

### 1. `src/components/DealDetailDialog.tsx` (novo)

Modal grande usando `Dialog` com `sm:max-w-2xl`. Estrutura:

- **Header**: Título da negociação (editável inline), botão fechar
- **Seção Informações**: Cliente, valor, status atual, data de cadastro, dias na etapa, notas
- **Seção Comentários**: Lista de comentários com data/hora + campo de input para adicionar novo comentário
- **Footer fixo**:
  - Botão "Marcar como Vendido" (muda status para coluna final ou status especial)
  - 5 ícones de `Flame` (lucide-react) clicáveis para definir heat 1-5 (preenchidos até o nível selecionado)
  - Botão "Editar" que abre o `DealDialog` existente

### 2. `src/components/KanbanBoard.tsx` (editar)

- Substituir `onEditDeal` por `onViewDeal` que abre o `DealDetailDialog`
- Manter `DealDialog` disponível para edição a partir do detail modal

### 3. `src/components/DealCard.tsx` (editar)

- Mostrar indicador de calor (pequenos pontos ou chamas) no card quando `heat > 0`

## Fluxo

```text
Card click → DealDetailDialog (visualização completa)
  ├── Ver informações
  ├── Adicionar comentários (histórico)
  ├── Definir calor (1-5 chamas)
  ├── Marcar como vendido
  └── Botão Editar → abre DealDialog existente
```

