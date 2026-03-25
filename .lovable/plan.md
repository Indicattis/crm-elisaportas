

# Corrigir vinculação de cliente externo na negociação

## Problema

A tabela `deals` tem uma foreign key `deals_client_id_fkey` que referencia a tabela local `clients`. Quando tentamos salvar um ID de cliente da base externa, o PostgreSQL rejeita com 409 Conflict porque o UUID não existe na tabela local `clients`.

## Solução

### 1. Migration: remover a FK constraint

Executar uma migration SQL para dropar a foreign key, permitindo que `client_id` armazene IDs de clientes externos livremente:

```sql
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_client_id_fkey;
```

### 2. Atualizar `KanbanBoard.tsx`

Remover o `.select("*, clients(*)")` do fetch de deals (já que a relação FK não existirá mais) e usar apenas `.select("*")`.

### 3. Remover dependências da tabela local `clients`

- No `KanbanBoard`, remover o `fetchClients` e o state `clients` que buscam da tabela local (já não são usados após a migração para clientes externos).

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Dropar `deals_client_id_fkey` |
| `src/components/KanbanBoard.tsx` | Ajustar select de deals, remover fetch de clients local |

