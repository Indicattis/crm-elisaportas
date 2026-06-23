## Objetivo

Registrar cada tentativa de criação de lead via endpoint externo (`create-deal-external`) e exibir um log dessas tentativas dentro da tela **Fluxos de Captação** (`/crm-config` → aba Fluxos de Captação), para que você acompanhe em tempo real o que os parceiros estão enviando.

## O que será criado

### 1. Tabela `external_integration_logs` (Lovable Cloud)

Armazena cada chamada recebida no endpoint externo.

Campos principais:
- `source` — identificador da integração (ex.: "hunt")
- `status` — `success` | `duplicate` | `error`
- `http_status` — código HTTP retornado
- `title`, `phone` — dados enviados pelo parceiro
- `deal_id` — referência ao deal criado (quando houver)
- `assigned_to` — vendedor que recebeu o lead
- `warning` — aviso de duplicidade, se houver
- `error_message` — mensagem de erro, se houver
- `ip`, `user_agent` — metadados da requisição
- `raw_body` (jsonb) — corpo bruto recebido
- `created_at`

Acesso:
- Apenas **admins** podem ler.
- Apenas o `service_role` (edge function) escreve.

### 2. Edge function `create-deal-external`

Adicionar gravação de log em todos os caminhos de saída:
- Falha de auth (401)
- Payload inválido (400)
- Duplicidade detectada (sucesso com warning)
- Deal criado com sucesso (200)
- Erro interno (500)

A escrita do log não pode quebrar a resposta — qualquer falha ao gravar é silenciada.

### 3. UI em **Fluxos de Captação** (`LeadFlowManager.tsx`)

Adicionar uma seção/card **"Log de tentativas da integração externa"** acima ou abaixo da lista de fluxos existente, contendo:

- Lista das últimas 50 tentativas, ordenadas por data desc
- Cada item mostra: data/hora, status (badge colorido: verde sucesso, amarelo duplicado, vermelho erro), título, telefone, vendedor atribuído, e mensagem de aviso/erro quando houver
- Botão **Atualizar** para refazer a busca
- Botão **Limpar logs** (admin) para apagar registros antigos
- Estado vazio amigável quando não houver tentativas

Visível apenas para administradores (consistente com a RLS).

## Detalhes técnicos

- Migration SQL cria a tabela + RLS (`has_role(auth.uid(), 'admin')` para SELECT/DELETE; sem grant a `anon`/`authenticated` para INSERT — apenas service_role).
- A edge function usa o client com `SUPABASE_SERVICE_ROLE_KEY` (já presente) para inserir os logs.
- No frontend, a busca é feita com `supabase.from('external_integration_logs').select(...).order('created_at', { ascending: false }).limit(50)`.
- Badges usam tokens semânticos do design system (sem cores hardcoded).
