

# Fluxos de Captura de Leads Configuráveis

## Visão geral

Criar uma tabela `lead_flows` para armazenar fluxos de captura automática de leads. Cada fluxo define: nome, funil de destino, coluna (status), canal de aquisição padrão e gera um embed/URL únicos. A seção "Formulários" no /crm-config será substituída por uma gestão completa desses fluxos.

## Alterações

### 1. Nova tabela `lead_flows` (migração SQL)

```sql
CREATE TABLE public.lead_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  funnel_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Lead',
  acquisition_channel text,
  user_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_flows ENABLE ROW LEVEL SECURITY;

-- Admins gerenciam, authenticated visualizam
CREATE POLICY "Admins can manage lead_flows" ON public.lead_flows
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Authenticated can view lead_flows" ON public.lead_flows
  FOR SELECT TO authenticated USING (true);
```

### 2. Novo componente `LeadFlowManager.tsx`

- Lista todos os fluxos cadastrados em cards
- Botão "Novo Fluxo" abre dialog com campos: Nome, Funil (select), Coluna/Status (select dinâmico), Canal de Aquisição (select dos canais cadastrados), Ativo (switch)
- Cada card mostra: nome, funil, coluna, canal, código embed copiável
- Botões de editar e excluir em cada card
- O embed URL inclui o `flow_id` em vez de `funnel_id+status`

### 3. Atualizar `CrmConfig.tsx`

- Renomear a seção "Formulários" para "Fluxos de Captação"
- Substituir o conteúdo atual (listagem de iframes por coluna) pelo novo `LeadFlowManager`

### 4. Atualizar edge function `submit-lead`

- Aceitar novo campo `flow_id` no body
- Se `flow_id` presente, buscar o `lead_flow` correspondente e usar seus campos (funnel_id, status, acquisition_channel) como defaults
- Manter retrocompatibilidade: se `funnel_id` vier direto (sem flow_id), funcionar como antes

### 5. Atualizar `LeadForm.tsx`

- Aceitar query param `flow_id` como alternativa a `funnel_id+status`
- Se `flow_id` presente, enviar para o submit-lead com esse campo

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Nova tabela `lead_flows` com RLS |
| `src/components/LeadFlowManager.tsx` | Novo componente CRUD de fluxos |
| `src/pages/CrmConfig.tsx` | Substituir seção Formulários por LeadFlowManager |
| `supabase/functions/submit-lead/index.ts` | Suportar `flow_id` com canal pré-configurado |
| `src/pages/LeadForm.tsx` | Suportar `flow_id` como query param |

