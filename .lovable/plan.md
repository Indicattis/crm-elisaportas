

# Mover "Dias na Etapa" para Acima do Valor com Cores Dinâmicas

## Alteração em `src/components/DealCard.tsx`

Reposicionar o indicador de tempo na etapa: remover do rodapé (linhas 168-173) e colocar como elemento próprio acima da linha de rodapé, com cores baseadas no tempo:

- **Verde** (`text-green-600`): 0-3 dias
- **Amarelo** (`text-yellow-600`): 4-7 dias  
- **Vermelho** (`text-destructive`): 8+ dias

### Layout resultante do card:
```text
Título          [tag] [avatar]
Cliente
🔥🔥
[Tags]
🕐 Xd na etapa  (colorido, acima do rodapé)
📅 dd/mm/yyyy          R$ valor
```

O bloco de "dias na etapa" vira uma linha independente com `Clock` icon e cor condicional. O rodapé fica apenas com data de criação à esquerda e valor à direita.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/DealCard.tsx` | Mover dias na etapa para cima do valor, adicionar cores dinâmicas |

