

# Transformar modal de detalhes em página dedicada

## Objetivo

Substituir o `DealDetailDialog` (modal) por uma **rota dedicada** `/deal/:id` (ou `/negociacao/:id`) que renderiza a mesma experiência em página inteira. Clicar num card no Kanban ou na lista navega para a nova página em vez de abrir o modal.

## Vantagens

- URL compartilhável (cada negociação tem link próprio).
- Botão "voltar" do navegador funciona.
- Mais espaço de tela, sem limite de modal.
- Recarregar a página mantém você na negociação.

## Mudanças

### 1. Nova página — `src/pages/DealDetail.tsx`

- Lê `:id` do `useParams`.
- Carrega o deal por id (`supabase.from("deals").select(...).eq("id", id).single()`).
- Carrega `statuses` do funil do deal e `columnColor` da coluna atual.
- Renderiza o conteúdo do `DealDetailDialog` (sem o wrapper `Dialog/DialogContent`).
- Botão "Voltar" no topo (`navigate(-1)` ou `/`).
- Estados de loading e "deal não encontrado".

### 2. Refatorar `DealDetailDialog.tsx` → `DealDetailView.tsx`

- Extrair todo o conteúdo interno (formulários, tarefas, comentários, histórico, anexos, ações de mover/arquivar/desqualificar) num componente `DealDetailView` reutilizável.
- Props simplificadas: `deal`, `statuses`, `columnColor`, `onUpdated`, `onClose` (para botão voltar).
- Remover toda a estrutura `Dialog`, `DialogContent`, `DialogHeader`. Substituir por container de página com classes equivalentes (mesmo estilo glassmorphism, mas sem overlay/portal).
- Manter sub-dialogs internos (loss reason, archive reason, disqualify) que continuam sendo modais.
- Apagar `DealDetailDialog` (ou deixar como wrapper fino que só renderiza `DealDetailView` dentro de um `Dialog` — **decidir: removeremos completamente** para simplificar).

### 3. Roteamento — `src/App.tsx`

Adicionar dentro do bloco autenticado:
```tsx
<Route path="/deal/:id" element={<DealDetail />} />
```

### 4. Navegação ao clicar no card

- `KanbanBoard.tsx`: trocar `handleViewDeal` para `navigate(\`/deal/${deal.id}\`)`. Remover estados `detailOpen`, `viewingDeal`, `viewingColumnColor` e o `<DealDetailDialog />`.
- `DealsListView.tsx`: prop `onEditDeal` continua igual (recebe o handler do parent que agora navega).
- `Results.tsx` e qualquer outro lugar que abria o modal: trocar para `navigate(\`/deal/${id}\`)`.

### 5. Voltar para a página anterior

- Botão "← Voltar" no topo da página → `navigate(-1)`. Se não houver histórico, fallback para `/`.
- Após arquivar/desqualificar/marcar como vendida, navegar de volta automaticamente.

## Pontos de atenção

- **Atualização em tempo real**: hoje o modal usa um `useEffect` para sincronizar `viewingDeal` quando `deals` muda. Na página dedicada, recarregamos o deal por id quando `onUpdated` é chamado (já buscamos do banco diretamente, então simples `refetch`).
- **Tags e anexos**: a query de carregamento atual continua válida — só muda o gatilho (mount da página em vez de abertura do modal).
- **Estilo**: aplicar `max-w-5xl mx-auto p-6` no container externo para manter legibilidade em telas grandes; mobile usa largura cheia.
- **Sub-dialogs internos** (motivo de perda, arquivo, desqualificação) **continuam como Dialog** — só o container principal vira página.
- **Acesso direto via URL**: se o usuário não tem permissão (RLS), a query retorna vazio → mostrar "Negociação não encontrada ou sem acesso".

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/DealDetail.tsx` | **Novo** — página que carrega deal por `:id` e renderiza `DealDetailView` |
| `src/components/DealDetailView.tsx` | **Novo** — extraído de `DealDetailDialog`, sem wrapper de Dialog |
| `src/components/DealDetailDialog.tsx` | **Removido** (conteúdo migrou para `DealDetailView`) |
| `src/App.tsx` | Adicionar rota `/deal/:id` |
| `src/components/KanbanBoard.tsx` | `handleViewDeal` navega; remover estados/JSX do modal |
| `src/pages/Results.tsx` | Trocar abertura de modal por `navigate("/deal/:id")` se aplicável |

