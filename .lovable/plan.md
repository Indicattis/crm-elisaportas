## Objetivo
Usar o secret `HUNT_INTEGRATION` como chave de API na edge function de criação externa de deals, em vez de `EXTERNAL_INTEGRATION_API_KEY`.

## Alterações
1. **Edge Function** — `supabase/functions/create-deal-external/index.ts`
   - Alterar a variável de ambiente lida de `EXTERNAL_INTEGRATION_API_KEY` para `HUNT_INTEGRATION`.
   - Atualizar a mensagem de erro/log interno que referencia o nome antigo.

2. **Documentação** — `supabase/functions/create-deal-external/README.md`
   - Atualizar a seção de autenticação para mencionar `HUNT_INTEGRATION` como o nome do secret configurado no backend.

## Pós-deploy
- Redeploy da edge function para que a nova variável de ambiente seja carregada.
- A chave fornecida pelo usuário (`6f4c8e7b1d9a2c5e8f3b7a1d4c9e6f2b8a5d1e7c3f9b4a6d8e2c5f7a1b9d3e6`) será validada a partir do secret já existente `HUNT_INTEGRATION`.