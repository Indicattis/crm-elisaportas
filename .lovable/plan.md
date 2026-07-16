## Objetivo
Permitir editar o **valor da venda** na página `/sale/:id` e registrar no **histórico da negociação** toda alteração de valor e de data de referência.

## Alterações

### 1. `src/pages/SaleDetail.tsx`
- Tornar o card **"Valor da venda"** editável:
  - Ao clicar no valor, abrir um Popover com um input numérico (máscara BRL) e botão "Salvar".
  - Ao salvar, chamar `supabase.from("deals").update({ value }).eq("id", deal.id)`.
  - Atualizar o estado local e mostrar toast de sucesso/erro.
- Ao atualizar `sold_at` (função `updateSoldAt` já existente) e ao atualizar `value`:
  - Após o `update` bem-sucedido, inserir em `public.deal_history` um evento do tipo `value_change` ou `sold_at_change`, com descrição legível (ex.: `"Alterou valor de R$ 1.000,00 para R$ 1.200,00"`, `"Alterou data de referência de 10/07/2026 para 15/07/2026"`) e `metadata` contendo `from`/`to`.
  - Recarregar a timeline (`load()`) ou inserir localmente no `history` para refletir imediatamente.

### 2. Histórico
A tabela `deal_history` já existe e é usada em outras partes do sistema — nenhuma migração é necessária. Vamos apenas inserir novas linhas via client (RLS já permite ao dono/admin/membro do funil escrever histórico).

## Detalhes técnicos
- Formatação BRL reutiliza o `fmtBRL` já presente.
- `event_type` novos: `value_change` e `sold_at_change` — a timeline já renderiza qualquer `event_type` (converte `_` em espaço) e mostra a `description`.
- Estado de saving separado para valor (`savingValue`) além do já existente `savingDate`.
