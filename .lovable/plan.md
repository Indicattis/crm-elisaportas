

# Corrigir busca de cidades com acentos no StateCitySelect

## Problema

A cidade "Taió" existe nos dados de SC, mas o componente `Command` (cmdk) usa comparação padrão que não normaliza acentos. Buscar "taio" não encontra "Taió", dando a impressão de que a cidade não existe.

## Solução

Adicionar um `filter` customizado no componente `Command` dentro de `StateCitySelect.tsx` que normalize acentos antes de comparar:

```tsx
<Command filter={(value, search) => {
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalize(value).includes(normalize(search)) ? 1 : 0;
}}>
```

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/StateCitySelect.tsx` | Adicionar filtro customizado sem acentos no `Command` |

