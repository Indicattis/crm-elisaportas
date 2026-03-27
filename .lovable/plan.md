

# Remover Sistema de Clientes e Adicionar Telefone/Email na Negociação

## Visão geral

Remover toda a lógica de vinculação de clientes (tanto do banco externo quanto da tabela `clients` local), adicionar campos `phone` (obrigatório) e `email` (opcional) diretamente na tabela `deals`, e excluir a página `/clients`.

## 1. Migração SQL

```sql
ALTER TABLE public.deals ADD COLUMN phone text;
ALTER TABLE public.deals ADD COLUMN email text;
```

Não remover `client_id` para não perder dados existentes, mas deixar de usá-lo no código.

## 2. `src/components/DealDialog.tsx` — Simplificar formulário

- Remover toda a lógica de cliente (combobox, busca externa, novo cliente inline)
- Remover imports de `externalSupabase`, `Popover`, `Command`, etc.
- Adicionar campos:
  - **Telefone** (obrigatório, `required`)
  - **E-mail** (opcional)
- Salvar `phone` e `email` no payload do deal
- Ao editar, preencher os campos com `deal.phone` e `deal.email`

## 3. `src/components/DealDetailDialog.tsx` — Substituir seção de cliente

- Remover toda a lógica de cliente externo (fetch, link, unlink, combobox)
- Remover imports de `externalSupabase`
- Substituir a seção "Cliente" por exibição direta de telefone e e-mail do deal
- Manter botão de WhatsApp usando `deal.phone`
- Permitir edição inline de telefone e e-mail

## 4. `src/components/DealCard.tsx` — Atualizar exibição

- Remover referência a `deal.clients?.name`
- Exibir `deal.phone` no lugar (com ícone de telefone)

## 5. Remover página e componentes de Clientes

- Excluir `src/pages/Clients.tsx`
- Excluir `src/components/ExternalClientDialog.tsx`
- Excluir `src/integrations/external-supabase.ts`
- Remover rota `/clients` de `src/App.tsx`
- Remover item "Clientes" do menu em `src/components/Header.tsx`

## 6. Limpar tipos e referências

- Atualizar `DealWithClient` type em todos os arquivos para não incluir `clients`
- Remover `[clients]` do `useState` no KanbanBoard
- Limpar imports não utilizados em `DealsListView.tsx`, `KanbanColumn.tsx`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar colunas `phone` e `email` em `deals` |
| `src/components/DealDialog.tsx` | Substituir cliente por campos telefone/email |
| `src/components/DealDetailDialog.tsx` | Remover cliente externo, exibir phone/email |
| `src/components/DealCard.tsx` | Exibir telefone em vez de nome do cliente |
| `src/components/KanbanBoard.tsx` | Limpar referências a clients |
| `src/components/KanbanColumn.tsx` | Limpar tipo DealWithClient |
| `src/components/DealsListView.tsx` | Limpar tipo DealWithClient |
| `src/App.tsx` | Remover rota `/clients` e import |
| `src/components/Header.tsx` | Remover item "Clientes" do menu |
| `src/pages/Clients.tsx` | Excluir arquivo |
| `src/components/ExternalClientDialog.tsx` | Excluir arquivo |
| `src/integrations/external-supabase.ts` | Excluir arquivo |

