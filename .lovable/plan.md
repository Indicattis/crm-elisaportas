

# Seção de Cliente no Modal de Detalhes da Negociação

## Visão geral

Adicionar ao `DealDetailDialog` a capacidade de visualizar informações completas do cliente da base externa e de vincular/alterar o cliente associado à negociação, usando o mesmo combobox de busca do `DealDialog`.

## Alterações

### 1. Atualizar `src/components/DealDetailDialog.tsx`

- Importar `externalSupabase` e `ExternalClient`
- Ao abrir o dialog, se `deal.client_id` existir, buscar os dados completos do cliente na tabela externa `clientes` pelo ID
- Substituir a seção simples de cliente (linhas 333-339) por um card expandido mostrando: nome, telefone, email, CPF/CNPJ, cidade/estado, tipo, badges fidelizado/parceiro
- Adicionar botão para vincular/trocar cliente usando o mesmo padrão Popover+Command (combobox com busca) já usado no `DealDialog`
- Ao selecionar um cliente, atualizar o `client_id` do deal no banco e recarregar os dados
- Permitir desvincular o cliente (opção "Sem cliente")

### 2. Seção de cliente no modal

```text
┌──────────────────────────────────┐
│ 👤 Cliente: João Silva    [✏️]  │
│   Tel: (11) 99999-0000          │
│   Email: joao@email.com         │
│   CPF/CNPJ: 123.456.789-00     │
│   Cidade/UF: São Paulo/SP       │
│   [Fidelizado] [Parceiro]       │
└──────────────────────────────────┘
```

Se não houver cliente vinculado, exibir botão "Vincular cliente" que abre o combobox.

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Adicionar seção de cliente com busca externa |

