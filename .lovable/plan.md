## Adicionar campo `observation` no body da integração externa

Adicionar suporte ao campo opcional `observation` (texto longo) no endpoint `create-deal-external`, que será salvo na coluna `notes` da negociação.

### Mudanças

**1. `supabase/functions/create-deal-external/index.ts`**
- Ler `observation` do body, junto de `title` e `phone`.
- Validar: opcional; se enviado, precisa ser string; limite de 5000 caracteres (retorna 400 se exceder).
- Trim do valor; se ficar vazio, salvar como `null`.
- Incluir `notes: cleanObservation` no `insert` em `deals`.
- Passar `observation` no `raw_body` (já é o body completo, então automático).

**2. `supabase/functions/create-deal-external/README.md`**
- Atualizar exemplo do body para incluir `observation`.
- Documentar como opcional, texto longo, salvo no campo de observações da negociação.

### Exemplo do novo body

```json
{
  "title": "Nome do Lead",
  "phone": "11912345678",
  "observation": "Cliente pediu retorno na parte da tarde. Interesse no plano X..."
}
```

### Não muda
- Tabela `external_integration_logs` (o body completo já vai no `raw_body`).
- UI de logs (já mostra `raw_body` expandido).
- Demais campos automáticos (status, funnel, round-robin, etc.).