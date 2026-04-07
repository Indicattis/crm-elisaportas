

# Prazo de Tarefa: Dias ou Data Específica

## Visão geral

Substituir o campo atual de "horas" no formulário de criação de tarefa por um seletor com 3 modos de prazo: **Horas**, **Dias** ou **Data específica**.

## Alterações em `src/components/DealDetailDialog.tsx`

### 1. Novos estados
- `newTaskDeadlineMode`: `"hours"` | `"days"` | `"date"` (default: `"hours"`)
- `newTaskDeadlineDays`: number (default: 1)
- `newTaskDeadlineDate`: Date | undefined

### 2. UI do formulário de nova tarefa (linhas 1038-1047)
Substituir o campo de horas por:
- Um select com opções: "Horas", "Dias", "Data"
- Se modo = "hours": input numérico + label "horas" (como hoje)
- Se modo = "days": input numérico + label "dias"
- Se modo = "date": date picker usando Popover + Calendar (Shadcn)

### 3. Lógica de cálculo do deadline (`handleCreateManualTask`)
- **Horas**: `Date.now() + hours * 3600000` (como hoje)
- **Dias**: `Date.now() + days * 86400000`
- **Data**: usar a data selecionada diretamente (fim do dia: 23:59:59)

### 4. Reset ao criar/cancelar
Resetar `newTaskDeadlineMode` para "hours", `newTaskDeadlineDays` para 1, `newTaskDeadlineDate` para undefined.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Adicionar modos de prazo (horas/dias/data) no formulário de tarefa |

