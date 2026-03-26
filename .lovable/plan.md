

# Canal de Aquisição nas Negociações

## Visão geral

Adicionar campo `acquisition_channel` na tabela `deals` com os valores: Google, Facebook, Instagram, Tiktok, Indicação, Cliente fidelizado, Autorizado. Integrar nos formulários de criação/edição e no dashboard.

## 1. Migração SQL

```sql
ALTER TABLE public.deals ADD COLUMN acquisition_channel text;
```

Sem constraint — validação feita no frontend.

## 2. `src/components/DealDialog.tsx`

- Novo estado `channel` (string)
- Select com as 7 opções + "Sem canal"
- Incluir `acquisition_channel` no payload de insert/update
- Preencher estado ao editar deal existente

## 3. `src/components/DealDetailDialog.tsx`

- Exibir canal de aquisição no cabeçalho/info da negociação (badge ou texto)
- Permitir edição inline ou via select

## 4. `src/pages/Dashboard.tsx`

- Novo gráfico de pizza: distribuição de negociações por canal de aquisição
- Layout passa para 3x2 ou grid adaptável

## 5. `supabase/functions/submit-lead/index.ts`

- Aceitar campo `canal_aquisicao` no body e gravar como `acquisition_channel` no deal

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `acquisition_channel` |
| `src/components/DealDialog.tsx` | Campo select no formulário |
| `src/components/DealDetailDialog.tsx` | Exibir e editar canal |
| `src/pages/Dashboard.tsx` | Gráfico por canal de aquisição |
| `supabase/functions/submit-lead/index.ts` | Aceitar canal no lead |

