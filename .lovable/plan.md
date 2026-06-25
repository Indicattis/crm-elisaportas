## Problema

A integração externa envia o telefone com código do país Brasil (`55`) na frente — por exemplo `5554996097462` (13 dígitos). A função `create-deal-external` apenas tira os caracteres não numéricos e corta os 11 primeiros dígitos, gerando `55549960974` → `(55) 54996-0974`, em vez do correto `(54) 9 9609-7462`.

## Correção

Ajustar `maskPhoneBR` (ou normalizar antes de mascarar) em `supabase/functions/create-deal-external/index.ts` para remover o código de país `55` quando o número chega com 12 ou 13 dígitos começando por `55`. A lógica:

1. Remover não-dígitos.
2. Se tiver 12 ou 13 dígitos e começar com `55`, remover esse prefixo.
3. Cortar para no máximo 11 dígitos.
4. Aplicar a máscara `(XX) XXXXX-XXXX` como hoje.

Aplicar a mesma normalização ao `phoneDigits` usado para detectar duplicidade, e usar o telefone normalizado também na busca por duplicata (assim números já gravados errados continuam batendo via fallback de `slice(-8)`, que já existe).

## Validação

1. Redeploy da função `create-deal-external`.
2. Teste via `curl_edge_functions` com payload `{"title":"Teste","phone":"5554996097462"}` e confirmar no log `external_integration_logs` que `phone` foi salvo como `(54) 99609-7462`.
3. Testar também com `phone` já no formato nacional (`54996097462`) para garantir que não quebrou.

## Observação

Os registros antigos já gravados errados não serão corrigidos automaticamente — se quiser, posso rodar um update em lote depois, mas isso fica fora desta correção.
