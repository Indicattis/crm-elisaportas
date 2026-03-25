

# Combobox de Clientes Externos no DealDialog

## Visao geral

Substituir o `<Select>` de clientes no `DealDialog` por um combobox com campo de busca, alimentado pela base externa de clientes (mesma usada na pagina `/clients`).

## Alteracoes

### 1. Atualizar `src/components/DealDialog.tsx`

- Remover a prop `clients` (nao depender mais dos clientes locais)
- Adicionar estado para buscar clientes da base externa usando `externalSupabase`
- Buscar da tabela `clientes` com filtro `ativo = true` e `ilike` no campo `nome` baseado no texto digitado
- Substituir o `<Select>` por um Popover + Command (combobox pattern) usando os componentes `cmdk` ja existentes no projeto
- Ao digitar, filtrar clientes pelo nome com debounce
- Exibir nome e telefone/cidade nos itens do dropdown
- Manter o botao "Novo Cliente" para cadastro inline
- O `client_id` selecionado sera o `id` da base externa (salvar como texto no deal)

### 2. Fluxo do combobox

1. Usuario clica no campo de cliente -> abre popover
2. Digita texto -> busca na base externa com `ilike('%texto%')` no campo `nome`
3. Seleciona um cliente -> popover fecha, nome exibido no trigger
4. Opcao "Sem cliente" disponivel

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/components/DealDialog.tsx` | Substituir Select por Combobox com busca externa |

