# Barra lateral "Meus Clientes"

## O que o usuário vai ver
- Uma barra lateral à esquerda, **recolhida por padrão** (só um trilho estreito com ícone), disponível em todas as páginas internas.
- Ao expandir: lista dos clientes do vendedor logado, ordenada pelo **valor total vendido** (maior primeiro). Cada item mostra nome, telefone, total vendido e quantidade de vendas; clicar abre as vendas daquele cliente.
- Busca por nome/telefone no topo da lista.
- Dois botões no topo: **Nova negociação** e **Novo contato** (abrem os formulários já existentes, com o telefone/nome preenchidos quando acionados a partir de um cliente).
- Administradores: um seletor de vendedor no topo da barra para ver os clientes de qualquer vendedor.

## Como os clientes são formados
- Cliente = uma pessoa com telefone único **por vendedor** (o mesmo telefone não se repete na lista de um vendedor).
- O vendedor dono é o responsável pela venda (ou quem criou, se não houver responsável).
- Gerado automaticamente:
  1. **Agora:** uma carga inicial cria os clientes a partir de todas as negociações já vendidas e liga cada venda ao seu cliente.
  2. **Daqui pra frente:** toda vez que uma negociação for marcada como vendida, o cliente é criado (ou reaproveitado se o telefone já existir) automaticamente.
- Vendas sem telefone não geram cliente (não há como evitar duplicidade sem ele).

## Detalhes técnicos
- Migração (aditiva):
  - `clients`: adicionar `phone_digits text` (só dígitos) + índice único `(user_id, phone_digits)` onde não nulo.
  - Função `upsert_client_from_deal()` + trigger `AFTER INSERT/UPDATE OF status, sold_at, assigned_to` em `deals`: quando `status = 'Vendido'` e telefone tem >= 10 dígitos, faz upsert em `clients` (dono = `coalesce(assigned_to, user_id)`) e preenche `deals.client_id`.
  - Backfill na mesma migração: insere clientes distintos de todas as negociações vendidas (nome da venda mais recente) e atualiza `deals.client_id`.
  - RLS de `clients`: revisar/adicionar leitura para o próprio vendedor e admins (`has_role`).
- Frontend:
  - `src/components/ClientsSidebar.tsx` usando shadcn `Sidebar` com `collapsible="icon"`, `defaultOpen={false}`; integrado ao `AppLayout` com `SidebarProvider` e `SidebarTrigger` no header (header continua montado).
  - Agregação: busca `clients` do vendedor + `deals` vendidas com `client_id`, soma `value` por cliente, ordena desc.
  - Botões reutilizam `DealDialog` e `ContactDialog` (contato pede funil/coluna de contatos).
  - Mobile: barra abre como gaveta pelo botão no header.
- Registrar decisão no `AGENTS.md` (clientes derivados de vendas via trigger).
