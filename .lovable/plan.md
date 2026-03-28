

# Corrigir submit-lead para salvar telefone e e-mail nos campos corretos

## Problema

A edge function `submit-lead` salva telefone e e-mail no campo `notes` (como texto livre), em vez de usar as colunas `phone` e `email` da tabela `deals`. Isso faz com que leads da landing page não tenham os dados de contato nos campos corretos.

## Correção em `supabase/functions/submit-lead/index.ts`

- Adicionar `phone` e `email` diretamente no payload de insert do deal
- Manter nas `notes` apenas estado e cidade (informações que não têm campo próprio)

### Antes
```typescript
notes: "Tel: xxx | Email: xxx | Estado: xx | Cidade: xx"
// phone e email NÃO são gravados nos campos próprios
```

### Depois
```typescript
phone: phone || null,
email: email || null,
notes: "Estado: xx | Cidade: xx"  // só estado e cidade
```

## Corrigir negociação #5 existente

Usar o insert tool para mover os dados de `notes` para os campos `phone` e `email` da negociação existente (se o usuário aprovar).

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/submit-lead/index.ts` | Gravar phone/email nos campos corretos |

