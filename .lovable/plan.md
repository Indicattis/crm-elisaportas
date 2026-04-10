

# Ações permitidas por etapa do funil

## Visão geral

Adicionar uma configuração por coluna de funil que define quais ações finais o vendedor pode executar nas negociações daquela etapa: "Vendido", "Perdida" e "Desqualificar". Administradores sempre terão acesso a todas as ações, independente da configuração.

## Alterações

### 1. Migração SQL

Adicionar coluna `allowed_actions` na tabela `funnel_columns`:

```sql
ALTER TABLE public.funnel_columns 
ADD COLUMN allowed_actions text[] NOT NULL DEFAULT ARRAY['sold','lost','disqualified'];
```

Valores possíveis no array: `sold`, `lost`, `disqualified`. Por padrão, todas as ações estarão habilitadas.

### 2. `src/components/FunnelColumnList.tsx`

- Adicionar um seletor multi-check (checkboxes) por coluna para definir quais ações são permitidas: Vendido, Perdida, Desqualificar
- Salvar o array `allowed_actions` ao alterar
- Exibir de forma compacta ao lado dos outros seletores da coluna

### 3. `src/components/DealDetailDialog.tsx`

- Carregar `allowed_actions` da coluna atual do deal (buscar em `funnel_columns` pelo `funnel_id` + `status`)
- Para vendedores: exibir os botões "Vendido", "Perdida" e "Desqualificar" apenas se a ação correspondente estiver em `allowed_actions`
- Para administradores: exibir todos os botões sempre (ignorar restrição)

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `allowed_actions` em `funnel_columns` |
| `src/components/FunnelColumnList.tsx` | Adicionar checkboxes de ações permitidas por coluna |
| `src/components/DealDetailDialog.tsx` | Filtrar botões de ação conforme `allowed_actions` e role |

