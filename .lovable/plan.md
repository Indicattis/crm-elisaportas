

# Formulário Embeddable de Leads para o CRM

## Visão geral

Criar um formulário embeddable (iframe) que sites externos podem incorporar para enviar leads diretamente ao CRM como negociações. O formulário terá campos Nome, Telefone, Email, Estado e Cidade, e o funil/coluna de destino será configurável via parâmetros de URL.

## Arquitetura

```text
Site Externo (iframe)
  └─> /lead-form?funnel_id=xxx&status=Lead
        └─> Edge Function "submit-lead" (POST, público)
              ├─> Insert na tabela "clientes" (base externa)
              └─> Insert na tabela "deals" (base interna)
```

## 1. Edge Function `submit-lead`

Endpoint público (sem JWT) que:
- Recebe JSON: `{ name, phone, email, estado, cidade, funnel_id, status }`
- Valida campos obrigatórios (name, funnel_id)
- Insere cliente na base externa (`externalSupabase.from("clientes").insert(...)`) com `ativo: true`
- Busca um user_id admin do funil (owner do funnel) para associar ao deal
- Insere deal na base interna via service role: `{ title: name, client_id, value: 0, status, funnel_id, user_id }`
- Retorna `{ success: true, deal_id }`
- CORS headers para permitir chamadas de qualquer origem

## 2. Rota pública `/lead-form`

Página React acessível sem autenticação:
- Lê `funnel_id` e `status` dos query params da URL
- Formulário com campos: Nome*, Telefone, Email, Estado, Cidade
- Ao submeter, chama a edge function `submit-lead`
- Exibe mensagem de sucesso/erro
- Design limpo e minimalista, pensado para iframe
- Sem header/sidebar do app

## 3. Alterações no App.tsx

- Adicionar rota `/lead-form` fora do `AuthGuard`, renderizando a página pública

## 4. Página de configuração do embed

No `/crm-config` (ou no modal de configuração do funil), mostrar ao admin:
- Código HTML do iframe pronto para copiar, com os parâmetros do funil selecionado
- Exemplo: `<iframe src="https://...app/lead-form?funnel_id=xxx&status=Lead" />`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/submit-lead/index.ts` | Criar edge function pública |
| `src/pages/LeadForm.tsx` | Criar página do formulário |
| `src/App.tsx` | Adicionar rota `/lead-form` fora do AuthGuard |
| `src/pages/CrmConfig.tsx` | Adicionar seção com código embed copiável |

