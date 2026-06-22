## Contexto

O parceiro quer criar cards (deals) externamente e está pedindo **Host do Supabase + Service Role Secret** para escrever direto na tabela `deals`.

**Não recomendo entregar o Service Role.** Motivos:

- O Service Role bypassa toda a RLS — quem tiver a chave lê/edita/apaga qualquer dado do CRM (deals, profiles, user_roles, anexos, etc.), não só cria card.
- Na Lovable Cloud essa chave não é exposta para compartilhamento de forma segura, e se vazar é preciso rotacionar tudo.
- Escrever direto na tabela ignora as regras de negócio que já existem (triggers de tarefas, histórico, limpeza de campos bloqueados por coluna, checagem de duplicidade de telefone, etc.). O card entra "cru" e quebra fluxos.

Já existe no projeto a edge function `submit-lead` que faz exatamente esse papel (recebe payload, valida, faz round-robin, cria histórico). A integração do parceiro deve seguir o mesmo padrão: **uma edge function dedicada protegida por API key**.

## Conferência dos dados que o parceiro mandou

- `funnel_id = 027c0fb7-eb3d-49a8-8377-9a533d9768b5` ✅ existe e tem a coluna **"Fazer orçamento"** (posição 1) ✅
- Os 3 `user_id` para rotação ✅ vou validar que os 3 existem e estão ativos antes de subir.
- Campos automáticos (`id`, `deal_number`, `created_at`, `updated_at`) ✅ corretos.
- `archived = false` ✅ já é default.
- `heat` (calor do lead): hoje é um `integer` default `0`. **Não existe regra de cálculo automática** no sistema — é manual. Precisa alinhar com o parceiro: enviar valor fixo (ex.: 0), ou nós aceitamos um número (0–100) que ele mandar, ou ignoramos o campo.
- `user_id` vs `assigned_to`: o parceiro diz que os dois rotacionam pelo mesmo set. Faz sentido (dono = responsável), só confirmar.
- `title` e `phone`: ok. Aplicar a mesma máscara BR `(XX) XXXXX-XXXX` e checagem de duplicidade que o sistema já usa.

## O que proponho fazer

### 1. Criar edge function `create-deal-external`

- Endpoint público (sem JWT), protegido por um header `x-api-key` com um secret novo `EXTERNAL_INTEGRATION_API_KEY` (gerado pelo Lovable, entregue ao parceiro 1x).
- Aceita JSON:
  ```json
  { "title": "string", "phone": "string", "heat": 0 }
  ```
- Validação com Zod (`title` obrigatório, `phone` obrigatório com pelo menos 4 dígitos, `heat` opcional inteiro 0–100).
- Aplica máscara BR ao telefone e avisa (sem bloquear) se já existe deal com mesmo telefone — igual `submit-lead`.
- Faz round-robin entre os 3 user_ids informados, escolhendo quem tem menos deals ativos (`archived=false`) no funil — mesma lógica de `submit-lead`.
- Insere em `deals` com: `funnel_id` fixo, `status = 'Fazer orçamento'`, `user_id = assigned_to = escolhido`, `archived = false`, `heat = payload.heat ?? 0`.
- Registra em `deal_history` (`event_type = 'creation'`, descrição "Criado via integração externa").
- CORS habilitado, erros 400/401/500 com corpo JSON claro.
- Resposta: `{ success: true, deal_id, deal_number, assigned_to, duplicate_warning? }`.

### 2. Documentação para o parceiro

Um README curto com:
- URL do endpoint: `https://<projeto>.functions.supabase.co/create-deal-external`
- Header obrigatório: `x-api-key: <chave>` + `Content-Type: application/json`
- Schema do body e exemplo `curl`
- Códigos de resposta e formato de erro
- Política de retry (idempotência: hoje não há, então orientar a não reenviar em caso de timeout sem checar)

### 3. Texto sugerido de resposta ao parceiro

> "Faz sentido a integração, mas **não vamos liberar o Service Role Secret** — ele dá acesso total ao banco (lê e edita qualquer dado do CRM, não só criação de card) e também ignora as regras de negócio do sistema (criação de tarefas, histórico, limpeza de campos por coluna, validação de duplicados).
>
> Em vez disso, vamos expor um **endpoint HTTPS dedicado** para vocês: `POST /create-deal-external`, autenticado por uma **API key** que enviamos por canal seguro. Ele já faz internamente tudo que vocês descreveram (funil fixo, status "Fazer orçamento", round-robin entre os 3 usuários, `archived=false`) e devolve o `deal_id` e `deal_number` criados.
>
> Sobre o `heat`: hoje não existe cálculo automático no nosso lado, é um inteiro manual (default 0). Vocês conseguem enviar um valor (0–100) ou preferem que a gente fixe em 0? Se houver lógica de cálculo do lado de vocês, basta mandar no payload.
>
> Confirma esse formato pra gente liberar a URL, a chave e a documentação?"

## Detalhes técnicos

- Arquivo novo: `supabase/functions/create-deal-external/index.ts` (estrutura idêntica a `submit-lead`).
- Secret novo: `EXTERNAL_INTEGRATION_API_KEY` (gerado via `generate_secret`, 48+ chars).
- Sem alterações de schema — `deals` já tem todos os campos necessários.
- Sem mudanças no frontend.
- `supabase/config.toml` não precisa de bloco custom — `verify_jwt = false` já é padrão na Lovable Cloud; a autenticação é feita em código via `x-api-key`.

## Fora do escopo (a confirmar com você antes)

- Idempotência por chave externa (ex.: `external_id` único do parceiro). Recomendo adicionar depois para evitar duplicação em retries — exige nova coluna em `deals`.
- Rate limiting próprio.
- Webhook de volta para o parceiro com mudanças de status.

## O que preciso de você antes de implementar

1. Topa o caminho de **edge function + API key** (em vez de Service Role)?
2. Sobre `heat`: parceiro envia, ou fixamos em 0?
3. `user_id` e `assigned_to` rotacionam juntos no mesmo set, confirmado?
