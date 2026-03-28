

# Corrigir botão "Sair da negociação" — mostrar apenas para o responsável

## Problema

O botão "Sair da negociação" aparece para qualquer usuário quando `deal.assigned_to` não é nulo. Deveria aparecer apenas quando o usuário logado é o responsável pela negociação.

## Correção em `src/components/DealDetailDialog.tsx`

Linha 1197 — alterar a condição de:
```typescript
{deal.assigned_to && (
```
Para:
```typescript
{deal.assigned_to && currentUser && deal.assigned_to === currentUser.id && (
```

Isso garante que só o próprio responsável veja o botão de sair.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Ajustar condição do botão "Sair da negociação" |

