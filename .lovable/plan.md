# Campos bloqueados por coluna do funil

Hoje cada coluna do funil tem **Requisitos de entrada** (campos obrigatórios). Vamos adicionar a configuração oposta: **Campos bloqueados** — campos que não podem existir/serem preenchidos enquanto o card estiver naquela coluna. Ao entrar na coluna, os valores são limpos automaticamente; nos formulários e edições, os campos ficam escondidos/desabilitados.

## Banco de dados

Nova tabela `column_blocked_fields` (espelho de `column_entry_requirements`):
- `column_id` → `funnel_columns.id` (cascade)
- `field_name` text
- `user_id` uuid
- timestamps + RLS equivalente à de requirements
- unique (`column_id`, `field_name`)

Trigger `clear_blocked_fields_on_status_change()` em `deals` (BEFORE UPDATE OF status / BEFORE INSERT):
- busca a coluna destino via `funnel_id` + `status`
- para cada `field_name` em `column_blocked_fields`, zera o campo correspondente no registro (`NEW.phone := NULL`, etc.)
- campos cobertos abaixo

Também limpa dados relacionados quando aplicável:
- `tags` → `DELETE FROM deal_tags WHERE deal_id = NEW.id` (em trigger AFTER)
- `acquisition_channel` → seta `acquisition_channel_id = NULL`

## Campos suportados (mesma lista de requisitos + extras pedidos)

`phone`, `email`, `value`, `state`, `city`, `acquisition_channel`, `notes`, `return_date`, `tags`

(Excluímos `task` porque não é um campo do deal.)

## Frontend

### Configuração (`src/components/FunnelColumnList.tsx`)
- Novo botão por coluna: **Campos bloqueados** (ícone de cadeado), abrindo Sheet idêntico ao de Requisitos.
- Mesma lista de checkboxes, gravando em `column_blocked_fields`.
- Validação: um mesmo campo não pode estar marcado como obrigatório E bloqueado na mesma coluna (toast de erro).

### Aplicação do bloqueio em todos os pontos
Hook utilitário `useBlockedFields(columnId | funnelId+status)` que retorna `Set<string>`.

- **`DealDialog.tsx`** (criar/editar pelo CRM): esconde inputs bloqueados conforme a coluna selecionada; ao trocar o status, limpa o estado local dos campos que passaram a ser bloqueados.
- **`DealDetailView.tsx`**: oculta/desabilita seções de campos bloqueados pela coluna atual.
- **`KanbanBoard.tsx`** (drag-and-drop): antes de mover, limpa localmente os campos bloqueados (o trigger garante no servidor).
- **`DealCard.tsx`**: não renderiza badges/ícones de campos bloqueados (telefone, valor, tags, canal).
- **`LeadForm.tsx`** (captação pública) e **`supabase/functions/submit-lead`**: lêem `column_blocked_fields` da coluna inicial do funil e omitem/limpam esses campos no payload antes de inserir.
- **`EntryRequirementsModal.tsx`**: filtra requisitos para não pedir campo que também é bloqueado (defesa em profundidade).

## Detalhes técnicos

```text
column_blocked_fields
├── id uuid PK
├── column_id uuid FK funnel_columns(id) ON DELETE CASCADE
├── field_name text
├── user_id uuid
├── created_at, updated_at
└── UNIQUE(column_id, field_name)

GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated
RLS: leitura para membros do funil; escrita só admin/dono do funil (mesma policy de column_entry_requirements)
```

Trigger SQL (resumo):
```sql
CREATE FUNCTION clear_blocked_fields_on_deal_change() RETURNS trigger ...
  -- monta SET dinâmico com base em field_name
  -- phone/email/notes → NULL; value → 0 ou NULL; state/city → NULL;
  -- return_date → NULL; acquisition_channel → acquisition_channel_id NULL
-- AFTER trigger separado para tags: DELETE FROM deal_tags
```

## Fora do escopo
- Histórico/log de campos limpos (pode ser adicionado depois se necessário).
- Bloquear campos personalizados além da lista acima.
