# Nova página "Contatos" e remoção das colunas de contatos do kanban

## O que muda para o usuário
- Novo botão **"Contatos"** no header, abrindo a página `/contatos`.
- A página mostra os contatos em **listagem (tabela)**, com abas/filtro por lista:
  - **Serralheiros - Nunca Fechou** (~714 contatos)
  - **Serralheiros - Já Compraram** (13 contatos)
- Recursos da listagem: busca por nome/telefone/cidade, filtro por estado, filtro por responsável (admin), paginação (50 por página, para não travar), foto do responsável, botão de mover contato para a outra lista, editar, excluir, criar contato e "Exportar telefones" (.txt).
- Cada vendedor continua vendo só os próprios contatos; admin vê todos.
- As duas colunas de contatos **somem do kanban** do funil Vendas. Os contatos **não são apagados**.

## Ordem segura (para não repetir a perda de dados)
1. Criar as "listas de contatos" e copiar a lista atual de cada contato para elas.
2. Desligar o vínculo de exclusão em cascata entre coluna e contato.
3. Conferir no banco que os 727 contatos estão nas listas novas.
4. Só então excluir as duas colunas do kanban.

## Detalhes técnicos
- Migração:
  - `contact_lists` (id, name, color, position, created_at) com GRANTs + RLS (autenticados leem; admin gerencia).
  - `contacts.list_id uuid` referenciando `contact_lists` (ON DELETE SET NULL); backfill a partir do nome da coluna atual.
  - `contacts.column_id` e `contacts.funnel_id`: remover NOT NULL e trocar FK para `ON DELETE SET NULL` (requer sua confirmação, pois é marcada como alteração sensível). Comentar ambas como DEPRECATED.
- Verificação por consulta antes de deletar as colunas (`count(*) where list_id is null` = 0).
- Exclusão das 2 linhas em `funnel_columns` via query de dados.
- Front: `src/pages/Contacts.tsx` (tabela paginada server-side com `range()`), rota em `App.tsx`, botão no header em `AppLayout`.
- Referências a colunas de contatos: aba Contatos de /relatorios passa a filtrar por lista; criação de contato pela sidebar de clientes passa a escolher lista. `ContactsColumn.tsx` deixa de ser usado no kanban (tipo de coluna "contatos" continua existindo, sem uso).
