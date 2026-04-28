# Adicionar "Data de retorno" aos requisitos de entrada

Adicionar a opção `return_date` (Data de retorno) à lista de requisitos de entrada que podem ser exigidos ao mover uma negociação para uma coluna do funil.

## Mudanças

### 1. `src/components/FunnelColumnList.tsx`
- Adicionar `{ value: "return_date", label: "Data de retorno" }` ao array `REQUIREMENT_FIELDS`, para aparecer como checkbox na configuração de requisitos da coluna em /crm-config.

### 2. `src/components/EntryRequirementsModal.tsx`
- Adicionar `return_date: "Data de retorno"` ao mapa `FIELD_LABELS`.
- Adicionar estado `returnDate` (Date | undefined) e `returnTime` (string "HH:mm", default "09:00").
- Inicializar com `deal.return_date` se já existir.
- Lógica de "missing": considerar faltante se `deal.return_date` for nulo.
- Renderizar bloco com Popover + Calendar (Shadcn) para data e Input `type="time"` para hora, seguindo o mesmo padrão visual dos outros campos.
- No `handleConfirm`: validar que a data foi preenchida; combinar data+hora em ISO e incluir `return_date` no `updates` enviado para `supabase.from("deals").update(...)`.

## Observações
- Não há migração de banco: a coluna `return_date` (timestamptz) já existe na tabela `deals`.
- Mantém o padrão atual do modal e respeita as guidelines de Calendar com `pointer-events-auto`.
