## Diagnóstico

A função `create-deal-external` faz round-robin escolhendo o vendedor com **menor número de deals no funil**, considerando **todo o histórico do funil "Fazer orçamento"**. Hoje os totais são:

- Suelen Cardoso — 431
- Victor Vieira Poleze — 522
- Vitória Janaina de Farias Pires — 1451

Como a Suelen tem o menor total histórico, ela vai receber **todos os leads novos** até alcançar o Victor (~90 leads). Só depois disso começa a alternar entre Suelen e Victor, e só muito mais tarde a Vitória entra. Por isso "tudo cai para a Suelen".

O comportamento é fruto da regra atual, mas não é o que o usuário espera — ele quer uma rotação justa entre os três a partir de agora.

## Correção proposta

Mudar a base de contagem do round-robin para considerar **apenas os leads criados pela própria integração**, ignorando o histórico anterior do funil. Assim a distribuição fica equilibrada entre Suelen, Victor e Vitória nas próximas entradas.

Fonte da contagem: tabela `external_integration_logs`, filtrando:

- `source = 'hunt'`
- `status IN ('success', 'duplicate')` (entradas que de fato criaram negociação)
- `assigned_to IN (ids dos três vendedores)`

Empate de contagem continua sendo resolvido pela ordem do array `ROTATION_USER_IDS` (Suelen → Victor → Vitória), que é o comportamento atual.

Nenhuma outra regra muda: validação, telefone duplicado, inserção do deal, histórico e log seguem iguais.

## Detalhes técnicos

Arquivo: `supabase/functions/create-deal-external/index.ts`

Substituir o bloco de contagem (linhas ~221-251) que hoje lê de `deals` por uma consulta a `external_integration_logs`:

```ts
const { data: logRows, error: countError } = await supabase
  .from("external_integration_logs")
  .select("assigned_to")
  .eq("source", "hunt")
  .in("status", ["success", "duplicate"])
  .in("assigned_to", ROTATION_USER_IDS);
```

E acumular `counts[r.assigned_to]++` a partir dessas linhas. O restante (escolha do `chosen` com menor contagem, mantendo a ordem para desempate) permanece igual.

Depois do deploy, os próximos leads devem distribuir-se 1-2-3 entre Suelen, Victor e Vitória.

## Validação

1. Redeploy da função.
2. Disparar 3 chamadas de teste consecutivas via `supabase--curl_edge_functions` e conferir que `assigned_to` retornado alterna entre os três IDs.
3. Conferir em `external_integration_logs` que as últimas linhas refletem a rotação.
