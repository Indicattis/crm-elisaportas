

# Anexar imagens nas negociações (Ctrl+V e botão)

## Visão geral

Permitir que usuários anexem imagens em negociações via Ctrl+V (paste de print screen) ou clicando em um botão de upload. As imagens serão armazenadas em um bucket de storage e referenciadas em uma tabela `deal_attachments`. Serão exibidas como thumbnails clicáveis dentro do modal da negociação.

## Alterações

### 1. Storage — criar bucket `deal-attachments`
Migração SQL:
- Criar bucket `deal-attachments` (público para leitura)
- Políticas RLS: autenticados podem inserir/deletar no bucket, todos podem ler

### 2. Tabela `deal_attachments`
Migração SQL:
```sql
CREATE TABLE deal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE deal_attachments ENABLE ROW LEVEL SECURITY;
```
- RLS: SELECT via `can_access_deal()`, INSERT para autenticados com `can_access_deal()`, DELETE para dono ou admin

### 3. `src/components/DealDetailDialog.tsx`
- Adicionar estado `attachments` e `uploadingImage`
- Função `fetchAttachments()` para carregar anexos do deal
- Função `handleUploadImage(file: File)` que faz upload ao storage e insere na tabela
- Handler `onPaste` no `DialogContent` que detecta imagens no clipboard e chama `handleUploadImage`
- Botão de anexar imagem (ícone de câmera/imagem) ao lado do botão de enviar comentário, com `<input type="file" accept="image/*" hidden />`
- Seção de galeria de anexos: thumbnails clicáveis que abrem a imagem em nova aba, com botão de deletar (dono ou admin)

### 4. Exibição
- Seção "Anexos" entre as tarefas e os comentários, mostrando grid de thumbnails
- Cada thumbnail com botão X para remover

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar bucket e tabela `deal_attachments` com RLS |
| `src/components/DealDetailDialog.tsx` | Paste handler, upload, galeria de anexos |

