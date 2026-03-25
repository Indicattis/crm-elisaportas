

# Integração com Base Externa de Clientes

## Visão geral

Conectar a página `/clients` a um projeto externo para buscar clientes da tabela `clientes`, exibindo os dados na interface existente. A chave anon é pública e pode ficar no código.

## Alterações

### 1. Criar `src/integrations/external-supabase.ts`

Criar um cliente Supabase separado apontando para o projeto externo:
- URL: `https://zddnvwqhfcqspmxscwyy.supabase.co`
- Anon Key: a chave fornecida

### 2. Atualizar `src/pages/Clients.tsx`

- Importar o cliente externo
- Buscar da tabela `clientes` (filtro `ativo = true`) em vez da tabela `clients` local
- Mapear colunas: `nome` → name, `email` → email, `telefone` → phone
- Exibir colunas extras relevantes (CPF/CNPJ, cidade, estado, tipo_cliente, fidelizado, parceiro)
- Remover ações de criar/editar/excluir (dados são read-only da base externa)

### 3. Atualizar `src/components/ClientDialog.tsx`

- Não será mais necessário para a base externa (manter arquivo mas não usar, ou remover import)

## Mapeamento de colunas

| Base externa (`clientes`) | UI |
|---|---|
| `nome` | Nome |
| `email` | E-mail |
| `telefone` | Telefone |
| `cpf_cnpj` | CPF/CNPJ |
| `cidade` / `estado` | Localização |
| `tipo_cliente` | Tipo |
| `fidelizado` | Badge fidelizado |
| `parceiro` | Badge parceiro |

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/integrations/external-supabase.ts` | Criar |
| `src/pages/Clients.tsx` | Atualizar fetch + UI |

