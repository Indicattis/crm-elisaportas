

# Botão Capturar no Footer + Restrição de Ações por Responsável

## Visão geral

Mover o botão "Capturar" do header para o footer do modal e restringir os botões de ação (Arquivar, Delegar, Sair, Perdida, Vendido) para que só sejam visíveis ao responsável pela negociação ou a administradores.

## Alterações em `src/components/DealDetailDialog.tsx`

### 1. Header — Remover botão Capturar

Na seção do header (linhas ~605-628), quando `deal.assigned_to` é null, em vez de mostrar o botão Capturar, exibir apenas um texto como "Sem responsável" ou um badge indicativo.

### 2. Footer — Adicionar botão Capturar

No footer (linhas ~1148-1217), adicionar o botão "Capturar" quando `!deal.assigned_to`. Manter o estilo destacado com `variant="default"`, `animate-pulse`, e `shadow-md`.

### 3. Footer — Restringir botões por responsável

Criar uma variável de controle:
```typescript
const isOwnerOrAdmin = role === "admin" || (currentUserId && deal.assigned_to === currentUserId);
```

Envolver os botões Arquivar, Delegar, Sair, Perdida e Vendido com a condição `isOwnerOrAdmin`. Isso garante que:
- **Admins** veem todos os botões sempre
- **Responsável** vê todos os botões da sua negociação
- **Outros usuários** veem apenas o botão Capturar (quando a negociação é órfã)

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Mover Capturar para footer, restringir ações por responsável |

