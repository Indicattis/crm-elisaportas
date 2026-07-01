# Integração externa — criação de cards

Endpoint para parceiros criarem cards (negociações) no funil de orçamentos sem precisar de acesso direto ao banco.

## Endpoint

```
POST https://wnlrbbeqnnvrmkoznnsg.supabase.co/functions/v1/create-deal-external
```

## Autenticação

Header obrigatório:

```
x-api-key: <CHAVE_FORNECIDA_PELO_TIME>
Content-Type: application/json
```

A chave é entregue por canal seguro (secret `HUNT_INTEGRATION` no backend). Não compartilhe nem versione em repositórios públicos.

## Body

```json
{
  "title": "Nome do cliente",
  "phone": "(11) 91234-5678",
  "observation": "Texto longo com observações sobre o lead..."
}
```

| Campo       | Tipo   | Obrigatório | Regras |
|-------------|--------|-------------|--------|
| title       | string | sim         | 1–255 caracteres |
| phone       | string | sim         | mínimo 4 dígitos; aceita com ou sem máscara e com/sem código do país `55`, é normalizado para `(XX) XXXXX-XXXX` |
| observation | string | não         | até 5000 caracteres; salvo no campo de observações |
| attachments | array  | não         | até 10 itens; ver seção abaixo |

## Anexos

O campo `attachments` aceita um array de até **10 arquivos**, cada um enviado por **URL pública** (recomendado) ou por **conteúdo base64**.

Cada item precisa ter `file_name` e **ou** `url` **ou** `data_base64` (nunca os dois). Tamanho máximo por arquivo: **10 MB**.

**Por URL pública:**
```json
{
  "file_name": "orcamento.pdf",
  "url": "https://exemplo.com/arquivo.pdf"
}
```

**Por base64:**
```json
{
  "file_name": "foto.jpg",
  "content_type": "image/jpeg",
  "data_base64": "iVBORw0KGgoAAAANSUhEUg..."
}
```

Se um anexo falhar (URL 404, base64 inválido, > 10 MB), a **negociação ainda é criada** e a resposta traz `attachments_warnings` listando as falhas. Prefira `url` para arquivos maiores — base64 infla o payload em ~33%.


Campos preenchidos automaticamente pela integração:
- `funnel_id`: fixo no funil de orçamentos
- `status`: `"Fazer orçamento"`
- `user_id` e `assigned_to`: rotação automática (round-robin pelo vendedor com menos negociações ativas) entre os 3 usuários combinados
- `heat`: `0`
- `archived`: `false`
- `id`, `deal_number`, `created_at`, `updated_at`: gerados pelo banco

## Resposta de sucesso (200)

```json
{
  "success": true,
  "deal_id": "uuid",
  "deal_number": 1234,
  "assigned_to": "uuid-do-vendedor",
  "warning": "Telefone já cadastrado na negociação ..." // opcional
}
```

O campo `warning` aparece apenas quando o telefone já existe em outra negociação — o card é criado mesmo assim.

## Erros

| Status | Significado |
|--------|-------------|
| 400    | Body inválido / campos obrigatórios ausentes |
| 401    | `x-api-key` ausente ou incorreta |
| 405    | Método diferente de POST |
| 500    | Erro interno |

Formato:

```json
{ "error": "mensagem" }
```

## Exemplo (curl)

```bash
curl -X POST https://wnlrbbeqnnvrmkoznnsg.supabase.co/functions/v1/create-deal-external \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE_AQUI" \
  -d '{"title":"João Pereira","phone":"11912345678","observation":"Cliente pediu retorno à tarde"}'
```

## Retry / idempotência

Não há chave de idempotência. Em caso de timeout, **não reenvie automaticamente** — consulte se o card foi criado antes de tentar de novo, para evitar duplicação.
