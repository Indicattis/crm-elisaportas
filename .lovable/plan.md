## Objetivo

Na página inicial (`/`), adicionar na barra de filtros um botão que abre um modal estilo "bloco de notas" com um texto longo compartilhado entre todos os usuários. Administradores podem editar e salvar; vendedores só visualizam.

## Mudanças no banco

Nova tabela `public.shared_notes` (singleton — apenas uma linha):

- `id` (uuid, PK, default `gen_random_uuid()`)
- `content` (text, default `''`)
- `updated_at`, `updated_by`

GRANTs: `SELECT` para `authenticated`, `ALL` para `service_role`. RLS habilitado.

Políticas:
- SELECT: qualquer usuário autenticado
- INSERT/UPDATE: apenas `has_role(auth.uid(), 'admin')`

Seed: inserir uma linha inicial vazia para servir como registro único.

## Frontend

### Novo componente `src/components/SharedNotesDialog.tsx`
- `Dialog` (shadcn) acionado por um botão externo.
- Conteúdo com visual de bloco de notas: fundo amarelo claro (`bg-yellow-50 dark:bg-yellow-950/30`), borda suave, fonte serifada/monoespaçada para o texto, linhas horizontais sutis via `background-image` para lembrar caderno pautado, cabeçalho com ícone `Notebook` (lucide).
- `Textarea` grande (mín. ~60vh), `readOnly` quando o papel não é admin.
- Carrega via `supabase.from('shared_notes').select('content').limit(1).single()`.
- Para admins: botão "Salvar" no rodapé que faz `update` na linha existente e mostra toast.
- Para vendedores: rodapé mostra apenas "Somente leitura" e data da última atualização.

### `src/components/KanbanBoard.tsx`
- Importar o novo componente e o ícone `Notebook` (lucide-react).
- Adicionar `<SharedNotesDialog />` (que renderiza seu próprio trigger `Button variant="outline" size="sm"` com ícone + texto "Notas") dentro da `<div className="flex items-center gap-3">` da barra de filtros (após o `StateCitySelect`, linha ~719).

Sem mudança em nenhum outro filtro ou lógica do Kanban.

## Notas técnicas

- O papel é lido via `useUserRole()` (já existe em `src/contexts/RoleContext.tsx`).
- A edição é protegida server-side pelas políticas RLS, não apenas no frontend.
- Como é uma única linha compartilhada, não há paginação nem múltiplas notas — se no futuro precisar de várias, basta criar UI adicional sobre a mesma tabela.
