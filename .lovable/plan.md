

# Botões de WhatsApp e Ligação nas Tarefas

## Visão geral

Adicionar botões de ação nas tarefas da sidebar: tarefas do tipo "mensagem" terão um botão para abrir conversa no WhatsApp, e tarefas do tipo "ligacao" terão um botão para ligar via WhatsApp — ambos usando o telefone do cliente externo vinculado à negociação (`externalClient.telefone`).

## Alterações em `src/components/DealDetailDialog.tsx`

### 1. Função auxiliar para formatar telefone

Criar função `formatPhoneForWhatsapp(phone: string)` que remove caracteres não numéricos e adiciona código do país (55) se necessário.

### 2. Botões nas tarefas (sidebar)

Dentro do map de tarefas pendentes (linhas ~845-880), ao lado do checkbox/conteúdo de cada tarefa:

- **Tipo "mensagem"**: botão com ícone do WhatsApp (ou `MessageSquare`) que abre `https://wa.me/{phone}` em nova aba
- **Tipo "ligacao"**: botão com ícone de telefone que abre `https://wa.me/{phone}` com intent de chamada, ou `tel:{phone}` como fallback

Ambos os botões só aparecem se `externalClient?.telefone` existir. Caso contrário, mostrar tooltip "Vincule um cliente para usar esta ação".

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Adicionar botões de WhatsApp/ligação nas tarefas |

