

# Cadastrar Clientes na Base Externa

## Visão geral

Adicionar um botão "Novo Cliente" na página `/clients` que abre um dialog para cadastrar um novo cliente diretamente na tabela `clientes` da base externa.

## Alterações

### 1. `src/pages/Clients.tsx`
- Adicionar botão "Novo Cliente" ao lado do título
- Adicionar estados `dialogOpen` e `editingClient`
- Importar e renderizar o novo `ExternalClientDialog`
- Chamar `fetchClients()` ao salvar

### 2. Novo componente: `src/components/ExternalClientDialog.tsx`
- Dialog com formulário contendo os campos da tabela externa: `nome` (obrigatório), `telefone`, `email`, `cpf_cnpj`, `cidade`, `estado`, `cep`, `endereco`, `bairro`, `tipo_cliente`, `observacoes`
- Switches para `fidelizado` e `parceiro`
- Insert via `externalSupabase.from("clientes").insert(...)` com `ativo: true`
- Callback `onSaved` para refresh da lista

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/pages/Clients.tsx` | Adicionar botão e integrar dialog |
| `src/components/ExternalClientDialog.tsx` | Criar dialog de cadastro de cliente externo |

