

# Edição inline no modal de detalhes + Marcar como Perdida

## Resumo

Remover o botão "Editar" do footer do `DealDetailDialog`. Os campos de informação (título, cliente, valor, observações) se tornam editáveis ao clicar neles. Adicionar botão "Marcar como Perdida" ao lado do "Marcar como Vendido".

## Alterações em `src/components/DealDetailDialog.tsx`

### 1. Edição inline nos campos

Adicionar estados locais para controlar qual campo está em modo edição:
- `editingField`: `"title" | "value" | "notes" | null`
- `editTitle`, `editValue`, `editNotes`: valores temporários durante edição

Cada campo de texto (título, valor, observações) será envolvido num wrapper clicável:
- Ao clicar, troca para um `Input` / `Textarea` com o valor atual
- Ao pressionar Enter ou perder foco (onBlur), salva via `supabase.from("deals").update(...)` e chama `onUpdated()`
- Ao pressionar Escape, cancela a edição

O **título** no header do dialog também será editável (clicando nele aparece um Input).

O **valor** mostrará um Input numérico inline.

As **observações** mostrarão um Textarea inline. Se não houver observações, mostrar um texto clicável "Adicionar observações...".

### 2. Remover botão "Editar"

- Remover o `<Button variant="outline">` com ícone `Pencil` do footer (linhas 382-385)
- Remover a prop `onEdit` da interface (e do componente pai `KanbanBoard`)

### 3. Botão "Marcar como Perdida"

- Adicionar um botão vermelho ao lado do botão verde no footer
- Ícone: `XCircle` do lucide-react
- Texto: "Marcar como Perdida"
- Ação: `handleMarkAsLost` — deleta o deal do banco (`supabase.from("deals").delete()`) e fecha o dialog com toast de confirmação

### 4. Atualizar `KanbanBoard.tsx`

- Remover a prop `onEdit` passada ao `DealDetailDialog`
- Remover a função `handleEditDeal` (não mais necessária para o detail dialog)
- Manter o `DealDialog` para criação de novos deals

### Layout do footer atualizado

```text
[🔥🔥🔥🔥🔥]     [❌ Perdida] [✅ Vendido]
```

### Layout dos campos editáveis

```text
Título (clicável → Input)
👤 Cliente: Nome (somente leitura)
💰 Valor: R$ 1.000,00 (clicável → Input number)
📅 Criado em: 01/01/2025 (somente leitura)
🕐 Na etapa: 3 dias (somente leitura)

Observações (clicável → Textarea)
```

