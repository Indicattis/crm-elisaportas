

# Adicionar Loading States em Todas as Telas

## Visão geral

Adicionar indicadores de carregamento (skeletons e spinners) em todas as telas e componentes onde dados, layout ou permissões estão sendo carregados, garantindo feedback visual consistente.

## Locais que precisam de loading

### 1. `KanbanBoard.tsx` — Sem loading ao carregar funis, colunas e deals
- Adicionar estado `loading` que fica `true` durante o fetch de funis/colunas/deals
- Exibir skeletons de colunas enquanto carrega (retângulos simulando as colunas do kanban)
- Exibir skeleton no seletor de funil enquanto funis carregam

### 2. `Clients.tsx` — Já tem loading básico ("Carregando..." texto)
- Substituir o texto "Carregando..." por skeletons de linhas da tabela (5-6 linhas com retângulos animados)

### 3. `CrmConfig.tsx` — Sem loading ao carregar funis e colunas
- Adicionar estado `loading` no fetch inicial de funis
- Exibir skeleton nos cards de menu e na lista de funis/colunas

### 4. `FunnelMembersManager.tsx` — Sem loading visual ao carregar membros
- Adicionar skeleton enquanto membros e usuários disponíveis carregam

### 5. `TeamManager.tsx` — Já tem loading com spinner
- OK, já implementado

### 6. `AuthGuard.tsx` e `RoleGuard.tsx` — Já têm spinner
- OK, já implementados

### 7. `Profile.tsx` — Já tem loading com spinner
- OK, já implementado

## Implementação

Usar o componente `Skeleton` existente (`src/components/ui/skeleton.tsx`) para manter consistência visual. Padrão: skeletons que imitam o layout final (linhas de tabela, cards, colunas).

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/KanbanBoard.tsx` | Adicionar estado loading + skeletons de colunas |
| `src/pages/Clients.tsx` | Substituir texto por skeleton rows na tabela |
| `src/pages/CrmConfig.tsx` | Adicionar loading + skeletons nos cards/funis |
| `src/components/FunnelMembersManager.tsx` | Adicionar skeleton ao carregar membros |

