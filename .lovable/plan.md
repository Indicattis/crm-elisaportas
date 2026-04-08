

# Verificacao de Duplicidade de Telefone ao Criar Negociacao

## Visao geral

Ao criar (ou editar) uma negociacao, quando o usuario preencher o telefone, o sistema busca no banco se ja existe outra negociacao com o mesmo numero. Se existir, exibe um alerta amarelo (warning) informando: etapa do funil, nome do cliente e responsavel pelo atendimento. O usuario ainda pode prosseguir com a criacao -- e apenas um aviso, nao um bloqueio.

## Alteracoes em `src/components/DealDialog.tsx`

### 1. Novo estado
- `duplicateInfo`: `{ title: string; status: string; assignedName: string } | null`

### 2. Verificacao ao alterar telefone
- Criar funcao `checkDuplicatePhone(phoneValue: string)` com debounce (~500ms)
- Extrair apenas digitos do telefone para comparacao
- Buscar em `deals` onde os digitos do telefone coincidem, excluindo o deal atual (se editando)
- Se encontrar, buscar o `assigned_to` na tabela `profiles` para obter o nome
- Setar `duplicateInfo` com os dados encontrados

### 3. Exibir alerta
- Abaixo do campo de telefone, renderizar um `Alert` (variant warning/default) com icone `AlertTriangle`
- Texto: "Telefone ja cadastrado na negociacao **{title}** (etapa: {status}), atendido por **{assignedName}**"
- Estilo: borda amarela/laranja para chamar atencao sem bloquear

### 4. Limpar ao fechar/resetar
- Resetar `duplicateInfo` para null quando o dialog fecha ou telefone muda para vazio

## Tambem verificar no submit-lead (edge function)
- Adicionar verificacao similar na edge function `submit-lead` retornando um aviso no response (sem bloquear), para que leads externos tambem sejam alertados

## Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/components/DealDialog.tsx` | Adicionar verificacao de duplicidade e alerta visual |

