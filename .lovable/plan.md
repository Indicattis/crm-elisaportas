# Anexos na integração externa

## Formato do body

Adicionar campo opcional `attachments` (array) no POST `/create-deal-external`. Cada item pode ser enviado de duas formas:

**1. Por URL pública (recomendado — mais leve):**
```json
{
  "title": "João",
  "phone": "5554996097462",
  "observation": "...",
  "attachments": [
    { "file_name": "orcamento.pdf", "url": "https://exemplo.com/arquivo.pdf" }
  ]
}
```

**2. Por conteúdo base64 (para arquivos gerados pelo parceiro):**
```json
{
  "attachments": [
    {
      "file_name": "foto.jpg",
      "content_type": "image/jpeg",
      "data_base64": "iVBORw0KGgoAAAANSUhEUg..."
    }
  ]
}
```

## Regras

- `attachments`: opcional, array com até **10 itens**.
- `file_name`: obrigatório, 1–255 chars, extensão preservada.
- Cada item precisa ter **ou** `url` **ou** `data_base64` (não os dois).
- Tamanho máximo por arquivo: **10 MB** (limite do payload da edge function ≈ 20 MB total, então base64 grande estoura rápido — para arquivos grandes usar `url`).
- Content-type detectado pela extensão do `file_name` se não vier explícito.
- Se qualquer anexo falhar (URL 404, base64 inválido, > 10 MB), a negociação **ainda é criada**, e o retorno inclui `attachments_warnings: [...]` listando os erros. Não abortar o card por causa de anexo.

## Implementação (`supabase/functions/create-deal-external/index.ts`)

1. Validar `attachments` no bloco de validação (tipo array, tamanho, campos obrigatórios).
2. Após inserir o deal com sucesso, para cada anexo:
   - Se `url`: `fetch(url)` → obter bytes + content-type.
   - Se `data_base64`: decodificar (`Uint8Array.from(atob(...), c => c.charCodeAt(0))`).
   - Fazer upload em `storage.from("deal-attachments").upload(path, bytes, { contentType })` com path `${deal.id}/${crypto.randomUUID()}-${file_name}`.
   - Inserir linha em `deal_attachments` com `user_id = chosen` (o vendedor sorteado no round-robin).
3. Acumular sucessos/erros e devolver na resposta:
   ```json
   {
     "success": true,
     "deal_id": "...",
     "attachments_uploaded": 2,
     "attachments_warnings": ["foto.jpg: URL retornou 404"]
   }
   ```
4. Registrar no `external_integration_logs` (campo `warning` já existe) o total de anexos enviados/falhos.

## Documentação

Atualizar `supabase/functions/create-deal-external/README.md`:
- Nova seção "Anexos" com os dois formatos.
- Exemplos `curl` para cada caso.
- Limites (10 arquivos, 10 MB cada, preferir URL para arquivos grandes).

## Validação

1. Redeploy `create-deal-external`.
2. Teste 1: payload com 1 anexo por URL pública (imagem qualquer) → conferir card criado + anexo listado no `DealDetailView`.
3. Teste 2: payload com 1 anexo base64 pequeno → mesmo check.
4. Teste 3: URL quebrada → deal criado, `attachments_warnings` presente.
