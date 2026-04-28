# Fix: 0 leads transferidos na função "Transferir e desativar"

## Diagnóstico

Reproduzi o bug chamando a edge function diretamente com a id da Juliana (`92013f16…`), que tem **52 negociações com `assigned_to`**. A função respondeu `transferred_count: 0`.

A consulta usada na função é:

```ts
adminClient.from("deals")
  .select("id, funnel_id, user_id, assigned_to")
  .or(`user_id.eq.${from_user_id},assigned_to.eq.${from_user_id}`)
```

Mesmo com service role (sem RLS), esta chamada está retornando 0 linhas para esta combinação. O filtro `.or()` do PostgREST com dois `eq.<uuid>` está falhando silenciosamente neste caso. SQL direto retorna 52, então o problema é no encoding do filtro `or` no client.

Como consequência, depois de "transferir 0", a função ainda apaga `funnel_members` e `user_roles` da origem. Por isso a Juliana já está sem role, mas as 52 deals continuam apontando pra ela.

## Correção

Trocar o `.or()` por **duas consultas explícitas** e fazer merge no código (mais robusto e legível):

```ts
const { data: ownedDeals } = await adminClient
  .from("deals")
  .select("id, funnel_id")
  .eq("user_id", from_user_id)
  .eq(...) // archived se aplicável
  
const { data: assignedDeals } = await adminClient
  .from("deals")
  .select("id, funnel_id")
  .eq("assigned_to", from_user_id)
  .eq(...) // archived se aplicável

// Merge sem duplicar ids para a lista de history e funnel_members
// Update separados:
//   - UPDATE user_id = to_user_id WHERE id IN (ownedDeals)
//   - UPDATE assigned_to = to_user_id WHERE id IN (assignedDeals)
```

## Recuperação dos dados da Juliana

Depois do fix, basta abrir o card de "Vendedores desativados com leads pendentes", clicar em transferir e a transferência funcionará normalmente (a função respeita `skip_deactivation` para usuários já banidos).

## Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `supabase/functions/transfer-and-deactivate/index.ts` | Substituir o bloco do `.or()` por duas queries `.eq()` separadas e ajustar a montagem de `ownerIds`, `assigneeIds`, `allIds` e `fromFunnelIds`. |
