## Objetivo

Em `/crm-config`, ao criar/editar uma coluna, permitir escolher o **Tipo da coluna**:

1. **Coluna de negociações** (padrão atual)
2. **Coluna de aviso** (comportamento atual do `is_notice`)
3. **Coluna de contatos** (novo)

Colunas de contatos armazenam contatos (nome, cidade, estado, telefone). Cada card de contato mostra:
- Nome, cidade/estado, telefone
- Índice de **quantidade de negociações** criadas a partir dele
- Índice de **valor total** somado dessas negociações
- Botão **"Criar negociação"** que abre um seletor de coluna de destino (dentro do mesmo funil ou de outro) e cria a negociação pré-preenchida com os dados do contato.

## Banco de dados

**1. Consolidar tipo em `funnel_columns`**
- Novo enum `column_type` com valores: `deals`, `notice`, `contacts`.
- Adicionar coluna `column_type column_type NOT NULL DEFAULT 'deals'`.
- Migração de dados: onde `is_notice = true` → `column_type = 'notice'`. Manter `is_notice` por compatibilidade (ou remover depois — decisão: manter, marcado como legado; UI passa a ler `column_type`).

**2. Nova tabela `contacts`**

Campos de domínio:
- `funnel_id` (FK funnels, cascade)
- `column_id` (FK funnel_columns, cascade)
- `user_id` (dono/criador)
- `name`, `phone`, `state`, `city`, `notes`
- `position` (ordenação dentro da coluna)

Com `created_at`/`updated_at` + trigger `update_updated_at_column`, RLS espelhando `deals` (admin, dono, ou membro do funil pode ver; criar/editar/excluir por dono ou admin) e GRANTs para `authenticated` + `service_role`.

**3. Vínculo negociação → contato**
- Adicionar `contact_id uuid NULL REFERENCES public.contacts(id) ON DELETE SET NULL` em `deals`.
- Índice em `deals(contact_id)` para os contadores.

**4. View auxiliar (opcional)** `contact_deal_stats` retornando `contact_id, deals_count, deals_total_value` para leitura eficiente, ou calcular no cliente com uma query agregada.

## Backend/Regras existentes

- Triggers `handle_deal_tasks_on_status_change`, `clear_blocked_fields_on_deal_change`, `clear_blocked_tags_on_deal_change` continuam sem mudança: colunas de contatos não têm `task_group_id` nem status de deal.
- `create-deal-external` (edge function) não muda.

## Frontend

**1. `FunnelColumnList.tsx` (form da coluna)**
- Novo select **Tipo da coluna** com as 3 opções, substituindo/absorvendo o toggle atual "Coluna de aviso".
- Ao escolher `notice`: exibir apenas o campo `notice_text` (atual).
- Ao escolher `contacts`: ocultar seções irrelevantes (grupo de tarefas, campos bloqueados, requisitos de entrada, ordenação por data de retorno, bolinhas diárias, ações permitidas).
- Ao escolher `deals`: mantém o comportamento atual.

**2. `KanbanBoard.tsx` / `KanbanColumn.tsx`**
- Ao renderizar uma coluna, ramificar por `column_type`:
  - `deals` → renderização atual de `DealCard`.
  - `notice` → renderização atual do texto de aviso.
  - `contacts` → renderizar novo `ContactCard` a partir de contatos daquela coluna. Sem drag-and-drop entre colunas (contatos ficam na sua coluna). Ordenação por `position` ou nome.
- Header da coluna de contatos: contador `total de contatos` (dispensa os índices "início do dia → atual" das colunas de deals).
- Botão "+" na coluna de contatos abre `ContactDialog` (novo) em vez de `DealDialog`.

**3. Novos componentes**
- `ContactDialog.tsx`: form (nome, telefone com máscara BR já existente, estado/cidade via combobox IBGE já existente, notas). Criar/editar/excluir.
- `ContactCard.tsx`: mostra nome, cidade/estado, telefone, e dois índices — **N pedidos** e **R$ X,XX** (soma de `deals.value` onde `contact_id = contato.id`). Botão principal **Criar negociação**.
- `CreateDealFromContactDialog.tsx`: seletor de funil + coluna de destino (apenas colunas do tipo `deals`), abre o `DealDialog` já pré-preenchido com `title = contact.name`, `phone`, `state`, `city`, `contact_id = contact.id`, `funnel_id` e `status` selecionados.

**4. Contadores por contato**
- Uma query única no carregamento do board: `SELECT contact_id, count(*), sum(value) FROM deals WHERE contact_id IN (...) GROUP BY contact_id`, indexado no cliente por `contact_id` e injetado em cada `ContactCard`.

## Ordem de execução

1. Migração: enum `column_type`, coluna em `funnel_columns`, tabela `contacts` (com GRANTs + RLS + trigger updated_at), coluna `contact_id` em `deals`.
2. Ajustar `FunnelColumnList.tsx` (novo select + condicionais).
3. Ajustar `KanbanBoard.tsx`/`KanbanColumn.tsx` para carregar contatos por coluna e ramificar renderização.
4. Criar `ContactDialog`, `ContactCard`, `CreateDealFromContactDialog`.
5. Integrar contadores agregados de negociações por contato.

## Fora do escopo (agora)

- Mover contatos entre colunas / conversão em massa.
- Histórico de interações no contato.
- Importação de contatos via CSV ou integração externa.
