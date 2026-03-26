

# Página "Resultados" — Negociações Vendidas, Perdidas e Arquivadas

## Visão geral

Criar uma nova página `/results` acessível via menu "Resultados" no header, que exibe as negociações finalizadas (vendidas, perdidas e arquivadas) em formato de tabela com abas de filtro.

## 1. `src/pages/Results.tsx` — Nova página

- Três abas (Tabs): "Vendidas", "Perdidas", "Arquivadas"
- Cada aba mostra uma tabela com as negociações correspondentes
- Colunas: Título, Cliente, Valor, Responsável, Data de criação, Data de atualização
- **Vendidas**: query `deals` com `status = 'Vendido'` e `archived = false`
- **Perdidas**: deals que foram removidos — como deals perdidos são deletados fisicamente, buscar do `deal_history` com `event_type = 'lost'` ou considerar adicionar um status "Perdida" em vez de deletar
- **Arquivadas**: query `deals` com `archived = true`
- Filtro por funil (select dropdown) similar ao Kanban
- Busca por nome do deal

**Nota**: Atualmente "Perdida" remove o deal fisicamente. Para listar perdidas, usaremos o `deal_history` (event_type = 'status_change' ou similar) como registro. Alternativamente, podemos mudar a lógica para marcar como status "Perdida" em vez de deletar — isso será mais útil.

## 2. Migração SQL — Ajuste na lógica de "Perdida"

- Ao invés de deletar deals marcados como "Perdida", atualizar o status para `"Perdida"` e manter o registro
- Isso permite que a página de resultados liste as negociações perdidas

## 3. `src/components/Header.tsx` — Novo item de navegação

- Adicionar `{ path: "/results", label: "Resultados", icon: BarChart3 }` no array `allNavItems`, entre "Clientes" e "Configurações"

## 4. `src/App.tsx` — Nova rota

- Adicionar `<Route path="/results" element={<Results />} />` dentro do layout autenticado

## 5. `src/components/KanbanBoard.tsx` — Ajustar lógica de "Perdida"

- Em vez de deletar o deal quando marcado como "Perdida", fazer update do status para `"Perdida"`
- O filtro existente `.eq("archived", false)` no Kanban já oculta arquivadas; adicionar filtro para excluir status "Perdida" também

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/Results.tsx` | Criar página com abas Vendidas/Perdidas/Arquivadas |
| `src/components/Header.tsx` | Adicionar item "Resultados" no menu |
| `src/App.tsx` | Adicionar rota `/results` |
| `src/components/KanbanBoard.tsx` | Mudar "Perdida" de delete para update de status; filtrar no fetch |

