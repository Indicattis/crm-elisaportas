# Contatos individuais por vendedor

## Objetivo
Cada vendedor passa a ver apenas os seus próprios contatos nas colunas de contatos do kanban. Administradores continuam vendo todos.

## Estado atual (confirmado)
- A política de leitura da tabela `contacts` ("Contacts view accessible") permite que qualquer membro do funil veja todos os contatos daquele funil.
- As políticas de inserir, editar e excluir já são individuais (só o dono ou admin).
- A coluna de contatos (`ContactsColumn.tsx`) busca todos os contatos da coluna, sem filtro por dono.

## Mudanças

### 1. Banco de dados (migração)
- Remover a política `Contacts view accessible` da tabela `contacts`.
- Criar nova política de leitura: o usuário vê apenas contatos onde `user_id = auth.uid()`, ou todos se for admin.
- Resultado: vendedor só enxerga os próprios contatos; admin enxerga tudo.

### 2. Interface
- Nenhuma alteração necessária em `ContactsColumn.tsx`: a busca por coluna já respeitará automaticamente a nova regra do banco, e os contadores (total de contatos, pedidos, valor) passarão a refletir apenas os contatos do vendedor logado.
- Verificar no preview que um vendedor vê só seus contatos e o admin continua vendo todos.

## Observações
- Contatos já existentes continuam visíveis para o vendedor que os criou (o campo `user_id` já está preenchido em cada contato).
- A aba "Contatos" em `/relatorios` passa a mostrar apenas os contatos do próprio usuário para vendedores (admin vê todos) — mesmo comportamento das demais telas.
