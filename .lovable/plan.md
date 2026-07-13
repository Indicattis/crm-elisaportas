# Planejamento de Vendas — Kanban por Vendedor

Nova página tipo kanban onde cada coluna é um vendedor e cada card é um cliente em prospecção com nome, valor e temperatura (Quente/Morno). Cards se auto-ordenam por temperatura e são eliminados ao serem marcados como concluídos.

## Rota e navegação

- Rota: `/planejamento`
- Item no `Header.tsx`: **Planejamento** (ícone `Target` do lucide)
- Acessível a qualquer usuário autenticado

## Banco de dados

Nova tabela `sales_planning_clients`:

- `seller_id` — vendedor dono da coluna
- `name` — nome do cliente
- `value` — valor estimado (numeric)
- `temperature` — enum `hot` | `warm`
- `created_by` — quem cadastrou
- padrões: id, created_at, updated_at

Regras de acesso (RLS): qualquer usuário autenticado pode ler, criar, atualizar e deletar registros (conforme escolha do usuário). GRANTs para `authenticated` e `service_role`. Enum novo `sales_temperature` com valores `hot` e `warm`.

Ao marcar o checkbox de concluído, o registro é **deletado** (some para sempre).

## Layout da página

```text
┌───────────────────────────────────────────────────────────────┐
│  Planejamento de Vendas                                        │
│  Prospecção ativa por vendedor                                 │
├───────────────────────────────────────────────────────────────┤
│ ┌─Vendedor A──┐ ┌─Vendedor B──┐ ┌─Vendedor C──┐  ...           │
│ │ + adicionar │ │ + adicionar │ │ + adicionar │                │
│ │             │ │             │ │             │                │
│ │ 🔴 Cliente X│ │ 🔴 Cliente Y│ │ 🟠 Cliente Z│                │
│ │ R$ 12.000   │ │ R$  8.500   │ │ R$  4.200   │                │
│ │ ☐ concluir  │ │ ☐ concluir  │ │ ☐ concluir  │                │
│ │             │ │             │ │             │                │
│ │ 🟠 Cliente W│ │ 🟠 …        │ │ 🔴 …        │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
└───────────────────────────────────────────────────────────────┘
```

Colunas listam **todos** os usuários com role `vendedor`, alinhado ao padrão das outras telas (Kanban, Vendas, Delegar). Ordenação dentro da coluna: **Quente** antes de **Morno**, depois por maior valor, depois por mais recentes.

## Card (linha de cliente)

- Bolinha de temperatura à esquerda: vermelho para Quente, âmbar para Morno
- Nome do cliente em destaque
- Valor formatado em BRL abaixo
- Checkbox à direita — ao marcar, remove o card com pequena animação e faz o delete no banco
- Estilo consistente com o resto do CRM (glass, bordas arredondadas, relevo)

## Adicionar cliente

Botão `+ Adicionar` no topo da coluna abre um popover/dialog com:

- Nome (texto obrigatório)
- Valor (input numérico R$)
- Temperatura (toggle Quente / Morno, padrão Quente)

O `seller_id` já vem definido pela coluna. O `created_by` é o usuário autenticado.

## Interações

- Sem drag-and-drop entre colunas nesta primeira versão (o vendedor da coluna define o dono)
- Update otimista ao concluir e ao adicionar
- Toast de confirmação nas ações
- Loading skeletons na primeira carga

## Arquivos

- `src/pages/SalesPlanning.tsx` — página principal com fetch, colunas e estado
- `src/components/planning/PlanningColumn.tsx` — coluna de um vendedor
- `src/components/planning/PlanningClientCard.tsx` — card de cliente com checkbox
- `src/components/planning/AddPlanningClientDialog.tsx` — form de criação
- `src/App.tsx` — registrar rota `/planejamento`
- `src/components/Header.tsx` — item de navegação
- Migração para criar enum, tabela, GRANTs, RLS e trigger de `updated_at`
