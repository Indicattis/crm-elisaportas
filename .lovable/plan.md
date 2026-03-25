

# Cadastro de Cliente Inline no Modal de Negociação

## O que muda

O select de cliente no `DealDialog` ganha duas melhorias:
1. Opção "Sem cliente" para criar negociação sem vínculo
2. Botão "+ Novo Cliente" que expande campos inline (nome, email, telefone) para cadastrar um cliente no mesmo modal

## Implementação

**Arquivo: `src/components/DealDialog.tsx`**

- Adicionar estado `showNewClient` (boolean) e campos `newClientName`, `newClientEmail`, `newClientPhone`
- No select de cliente, adicionar item "Sem cliente" (valor vazio) no topo
- Adicionar botão "+ Novo Cliente" ao lado do select que alterna `showNewClient`
- Quando `showNewClient = true`, esconder o select e mostrar inputs de nome (obrigatório), email e telefone
- No `handleSubmit`: se `showNewClient` e `newClientName` preenchido, inserir o cliente na tabela `clients` primeiro, usar o ID retornado como `client_id` do deal
- Se nenhum cliente selecionado e não criando novo, `client_id = null` (permitido pelo schema)

```text
┌─────────────────────────────────┐
│ Cliente                         │
│ [Select cliente ▼] [+ Novo]    │
│                                 │
│ — OU quando "+ Novo" clicado —  │
│                                 │
│ Nome do cliente *               │
│ [__________________________]    │
│ E-mail            Telefone      │
│ [____________]  [____________]  │
│                    [Cancelar]   │
└─────────────────────────────────┘
```

Nenhuma alteração de banco necessaria — `client_id` ja e nullable.

