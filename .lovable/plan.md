## Bolas de status para contatos (persistentes)

### 1. Configuração da coluna (`/crm-config`)
Em `FunnelColumnList.tsx`, no bloco `currentType === "contacts"`, adicionar os mesmos controles hoje usados em colunas de negociações:
- Checkbox **"Bolas coloridas"** — grava em `funnel_columns.has_daily_color`.
- Seleção de cores permitidas (Vermelho / Amarelo / Verde) — grava em `funnel_columns.daily_colors`.

Reaproveitando os campos existentes evita nova migração de schema em `funnel_columns`.

### 2. Persistência da cor por contato
Criar tabela `contact_colors` (persistente, sem data):
- `contact_id` (FK → contacts, unique)
- `color` (text: red/yellow/green)
- `updated_by`, `updated_at`

Com RLS liberando leitura/escrita para membros do funil da coluna do contato (mesmo padrão de `contacts`), e GRANTs para `authenticated` + `service_role`.

Diferente de `deal_daily_color`, **não** haverá coluna `date` — a cor selecionada permanece indefinidamente até o usuário trocar.

### 3. UI do card de contato (`ContactsColumn.tsx`)
- Buscar as cores de todos os contatos da coluna junto com `fetchContacts`.
- Renderizar a bolinha no card do contato quando `funnel_columns.has_daily_color !== false`, respeitando as cores permitidas em `daily_colors`.
- Clique na bolinha cicla entre as cores permitidas e faz upsert em `contact_colors` (atualização otimista). Cor padrão inicial = primeira das permitidas (ex.: "red").
- Sem reset diário: o valor gravado é sempre o mesmo até troca manual.

### 4. Passagem de props
`KanbanBoard.tsx` já passa `column` para `ContactsColumn`; adicionar `hasDailyColor` e `allowedDailyColors` derivados de `column.has_daily_color` / `column.daily_colors`.

### Detalhes técnicos
- Migração: `CREATE TABLE public.contact_colors` + GRANTs + RLS + policies (SELECT/INSERT/UPDATE/DELETE para authenticated conforme acesso à `contacts` correspondente) + trigger `update_updated_at_column`.
- Índice único em `contact_id` para permitir `upsert onConflict: contact_id`.
- Nenhuma alteração em `deal_daily_color` nem no comportamento das colunas de negociações.
