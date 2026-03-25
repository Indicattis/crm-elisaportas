

# Gerenciamento de Funis e Configuração de Colunas

## Conceito

Criar um sistema onde o usuário gerencia **funis** (pipelines), e cada funil tem suas próprias **colunas** com nome, cor e ordem. O Kanban atual passa a ser dinâmico, carregando colunas do banco em vez de uma lista fixa.

## Modelo de Dados

```text
funnels                      funnel_columns
┌──────────────┐             ┌──────────────────┐
│ id (uuid PK) │◄────────────│ funnel_id (FK)   │
│ name         │             │ id (uuid PK)     │
│ user_id (FK) │             │ name             │
│ created_at   │             │ color (text)     │
│ position     │             │ position (int)   │
└──────────────┘             │ user_id          │
                             │ created_at       │
                             └──────────────────┘
```

- **deals.funnel_id** (nova coluna) vincula cada deal a um funil
- **deals.status** continua armazenando o nome da coluna

## Migração SQL

1. Criar tabela `funnels` com RLS (user_id = auth.uid())
2. Criar tabela `funnel_columns` com RLS e FK para funnels
3. Adicionar coluna `funnel_id` na tabela `deals`
4. Inserir funil padrão "Vendas" com as 10 colunas atuais e cores padrão
5. Atualizar deals existentes para apontar ao funil padrão

## Página /crm-config

Nova página protegida com:

- **Seletor de funil** no topo (dropdown) + botão "Novo Funil"
- **Lista de colunas** do funil selecionado, ordenável por drag-and-drop
- Cada coluna mostra: nome editável, seletor de cor (palette), botões mover/excluir
- Botão "Adicionar Coluna" no final
- Dialog para criar/editar/excluir funil

## Alterações no Kanban

- Header ganha seletor de funil ativo
- `KanbanBoard` carrega colunas do banco filtrando por `funnel_id`
- `DealDialog` filtra status pelas colunas do funil selecionado
- Coluna do Kanban recebe `color` prop para estilizar o header
- Remover constante `STATUSES` hardcoded de todos os arquivos

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/CrmConfig.tsx` |
| Criar | `src/components/FunnelColumnList.tsx` |
| Criar | `src/components/FunnelDialog.tsx` |
| Editar | `src/App.tsx` — rota `/crm-config` |
| Editar | `src/components/Header.tsx` — link "Configurações" |
| Editar | `src/components/KanbanBoard.tsx` — colunas dinâmicas + seletor funil |
| Editar | `src/components/KanbanColumn.tsx` — cor dinâmica |
| Editar | `src/components/DealDialog.tsx` — status dinâmicos |
| Migração | Nova migration com tabelas + seed |

## Sequência

1. Migration: criar tabelas `funnels` e `funnel_columns`, alterar `deals`, seed com dados atuais
2. Criar página `/crm-config` com CRUD de funis e colunas
3. Atualizar Kanban para usar colunas dinâmicas do funil selecionado
4. Adicionar link na navegação do Header

