## Objetivo
Adicionar "tracks" horizontais acima do header das colunas do kanban. Cada track cobre um intervalo de colunas contíguas, tem cor e texto. Admins criam/editam/removem arrastando; vendedores só visualizam. Múltiplas tracks podem ser empilhadas em linhas.

## Banco

Nova tabela `funnel_tracks`:
- `funnel_id` (fk funnels, cascade)
- `start_column_id`, `end_column_id` (fk funnel_columns)
- `color` (hex/text)
- `label` (text)
- `row_index` (int) — linha em que a track aparece (0, 1, 2...)
- timestamps padrão

Regras de acesso:
- SELECT: qualquer membro do funil (mesma regra usada em `funnel_columns`)
- INSERT/UPDATE/DELETE: apenas admins

GRANTs para authenticated + service_role; RLS habilitada.

## Frontend

### `KanbanBoard.tsx`
- Buscar `funnel_tracks` do funil junto com colunas.
- Renderizar uma área acima do grid de colunas com N linhas (uma por `row_index` usada).
- Cada track posiciona-se sobre o intervalo `[start_column_id .. end_column_id]` usando as mesmas larguras/offsets das colunas (calcular via refs das colunas ou grid template compartilhado).
- Ao recolher/expandir colunas, tracks acompanham o novo layout (recalcular no resize/mudança).
- Não renderizar na view "Tabs" (apenas na visualização em colunas).

### Novo componente `KanbanTracks.tsx`
- Recebe: colunas visíveis (com posição/largura), tracks, `isAdmin`.
- Renderiza cada track como uma barra colorida com o texto centralizado.
- Admin: bordas laterais viram handles de redimensionamento (arrastar para expandir/encolher sobre colunas vizinhas); clique na track abre modal de edição; botão "+" em cada linha vazia (e uma linha extra ao final) inicia criação por arrasto da coluna A até B.
- Vendedor: read-only, sem handles nem botões.

### Novo componente `TrackEditDialog.tsx`
- Campos: texto (label), cor (color picker + paleta pré-definida usando tokens semânticos), linha (row_index), botão excluir.
- Salva via supabase; fecha e atualiza estado local.

### Interação de criação por arrasto
- Ao clicar+arrastar num slot vazio da faixa de tracks, destaca as colunas cobertas em tempo real (highlight visual sobre os headers).
- Ao soltar, abre `TrackEditDialog` já com `start_column_id`, `end_column_id` e `row_index` preenchidos; salvar cria a track.

### Redimensionamento
- Arrastar handle esquerdo/direito muda `start_column_id`/`end_column_id` para a coluna mais próxima do cursor; persistir no drop.
- Impedir cruzamento (start deve vir antes ou igual a end na `position` da coluna).

## Design
- Track: barra fina (~28px) com `rounded-md`, cor de fundo escolhida, texto branco/preto conforme contraste, sombra leve seguindo o glassmorphism do projeto.
- Handles visíveis só no hover para admin.
- Espaçamento entre linhas de tracks: 4px.

## Não faz parte
- Reordenar linhas por drag vertical (edição do `row_index` só pelo modal).
- Tracks em cima de colunas não contíguas.
- Persistência de tracks para a view "Tabs".
