

# Requisitos de Entrada por Coluna do Funil

## Visão geral

Cada coluna do funil poderá ter "requisitos de entrada" configuráveis — campos obrigatórios da negociação e/ou a exigência de criar uma tarefa com data. Quando um card for arrastado para uma coluna com requisitos, o sistema valida se os dados estão preenchidos. Se faltar algum, abre um modal para o usuário completar as informações antes de permitir a movimentação.

## Alterações

### 1. Banco de dados — nova tabela `column_entry_requirements`

| Coluna | Tipo | Padrão |
|---|---|---|
| id | uuid | gen_random_uuid() |
| column_id | uuid | (ref funnel_columns) |
| field_name | text | — |
| user_id | uuid | — |
| created_at | timestamptz | now() |

`field_name` pode ser: `phone`, `email`, `value`, `state`, `city`, `acquisition_channel`, `notes`, `task` (valor especial para exigir criação de tarefa).

RLS: admins gerenciam, autenticados visualizam.

### 2. `src/components/FunnelColumnList.tsx`

- Adicionar botão de "Requisitos de entrada" (ícone `ShieldCheck`) ao lado do botão de configurações na linha de cada coluna
- Abrir uma nova Sheet lateral com:
  - Lista de checkboxes para campos: Telefone, E-mail, Valor, Estado, Cidade, Canal de aquisição, Notas
  - Checkbox especial "Tarefa obrigatória" — exige que o vendedor crie uma tarefa com data ao mover o card
  - Salvar/remover registros na tabela `column_entry_requirements`

### 3. `src/components/KanbanBoard.tsx` — Validação no drag-and-drop

- Ao concluir o drag (`handleDragEnd`), antes de efetivar a mudança:
  - Buscar requisitos da coluna destino
  - Validar se o deal possui os campos obrigatórios preenchidos
  - Se faltar algo ou se `task` for requisito, abrir um modal (`EntryRequirementsModal`)
  - Só efetivar a movimentação após o preenchimento

### 4. Novo componente `src/components/EntryRequirementsModal.tsx`

- Modal que exibe os campos faltantes para preenchimento inline
- Se o requisito `task` estiver ativo, exibe um formulário para criar tarefa (descrição + data)
- Botão "Confirmar" que salva os dados no deal, cria a tarefa se necessário, e efetiva a movimentação

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `column_entry_requirements` |
| `src/components/FunnelColumnList.tsx` | Botão + Sheet de requisitos |
| `src/components/EntryRequirementsModal.tsx` | Novo — modal de preenchimento |
| `src/components/KanbanBoard.tsx` | Validação no handleDragEnd |

