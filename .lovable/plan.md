

# Estilização das Etapas em Grupos de Tarefas igual ao modal da Negociação

## Objetivo

No `/crm-config` → Grupos de Tarefas, agrupar as tarefas **por etapa** com a mesma estilização do modal de detalhes da negociação: linha vertical colorida com bolinha, nome da etapa + contagem como cabeçalho, tarefas listadas abaixo de cada etapa e bloco "Sem etapa" no final.

## Como ficará (modo manual do grupo)

Em vez do layout atual (badges de etapas no topo + lista plana de tarefas com mini-bolinha):

```text
●─ Contato inicial   0/2          ← bolinha + nome da etapa + contagem
│   ┌──────────────────────────┐
│   │ 📞 Ligar para o cliente  │
│   │ Ligação • Prazo: 1 dia   │
│   └──────────────────────────┘
│   ┌──────────────────────────┐
│   │ 💬 Enviar mensagem       │
│   └──────────────────────────┘
●─ Proposta          0/1
│   ...
│
Sem etapa
   ┌──────────────────────────┐
   │ ...                      │
```

Cada bloco de etapa replica o JSX que existe em `DealDetailDialog` (linhas 1546–1582):

- `flex` com coluna esquerda `flex flex-col items-center mr-2.5` contendo `<span class="h-2.5 w-2.5 rounded-full" style={backgroundColor: stage.color}/>` e `<div class="flex-1 w-0.5" style={backgroundColor: stage.color, opacity: 0.35}/>`
- Conteúdo direito com cabeçalho `text-[11px] font-semibold` + contagem `completedCount/total` em `text-[10px] text-muted-foreground`
- Tarefas mantêm os mesmos cards atuais (com TypeIcon, descrição, "Prazo: …", botão de recorrência etc.) — só passam a ficar dentro do bloco da etapa

A seção "Etapas" no topo do card (gestão das etapas em si) continua existindo, mas é convertida em **lista compacta editável**: cada etapa aparece como uma linha pequena com bolinha colorida + nome + lápis/lixeira, em vez de badges grandes. Botão "+ Etapa" e "+ Nova Tarefa" continuam funcionando igual.

Tarefas sem etapa (`stage_id = null`) vão para um grupo "Sem etapa" no final, idêntico ao do modal.

Quando o grupo está em **modo "Agenda recorrente"**, nada muda — continua a lista atual de tarefas recorrentes.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/components/TaskGroupManager.tsx` | Reorganizar a seção `groupTasks.map(...)` em loop `groupStages.map(stage => ...)` com a mesma estrutura (linha vertical + dot + cabeçalho da etapa + contagem) usada em `DealDetailDialog` linhas 1546–1582; adicionar bloco "Sem etapa" para tarefas órfãs; converter os badges de etapas no topo em lista compacta com lápis/lixeira |

