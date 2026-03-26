

# Sidebar de Tarefas no Modal de Negociação

## Visão geral

Transformar o layout do `DealDetailDialog` de coluna única para um layout com sidebar à direita dedicada às tarefas da negociação. A área principal mantém o conteúdo atual (cliente, info, tags, comentários) e a sidebar exibe a lista de tarefas com checkboxes, prazos e indicadores de atraso.

## Alterações em `src/components/DealDetailDialog.tsx`

### 1. Expandir largura do modal

- Alterar `sm:max-w-2xl` para `sm:max-w-5xl` para acomodar o layout lado a lado.

### 2. Layout flex horizontal no conteúdo

Dividir a área scrollável em duas colunas:

```text
┌──────────────────────────────────────────────────┐
│  Header (título, status, avatar)                 │
├────────────────────────┬─────────────────────────┤
│  Conteúdo principal    │  Sidebar Tarefas        │
│  (cliente, valor,      │  ☐ Enviar mensagem      │
│   tags, observações,   │    📅 28/03 às 14:00    │
│   comentários)         │  ☑ Realizar ligação     │
│                        │    ✓ Concluída          │
│                        │                         │
│                        │  (ou "Sem tarefas")     │
├────────────────────────┴─────────────────────────┤
│  Footer (calor, perdida, vendido)                │
└──────────────────────────────────────────────────┘
```

- Coluna esquerda: `flex-1` com todo o conteúdo atual (client, info, notes, tags, comments)
- Coluna direita (sidebar): `w-72 border-l` com a lista de tarefas, removida da posição atual no conteúdo principal

### 3. Sidebar de tarefas

- Título "Tarefas" com ícone `ClipboardList` e contador de pendentes
- Lista de tarefas com checkbox, tipo (ícone), descrição e prazo
- Indicador visual de atraso (vermelho) para tarefas vencidas
- Exibir "Sem tarefas para esta etapa" quando vazio (sempre visível, diferente do atual que esconde a seção)
- Scroll independente na sidebar

### 4. Responsividade

- Em telas pequenas, a sidebar fica abaixo do conteúdo principal (flex-col) em vez de ao lado

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/DealDetailDialog.tsx` | Reestruturar layout com sidebar de tarefas |

