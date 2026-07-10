## Diagnóstico

A coluna **Lead** (funil Vendas) está configurada em `column_entry_requirements` com o campo obrigatório `value` — provavelmente por engano na configuração. Por isso, ao voltar um card da etapa "Fazer orçamento" para "Lead", o modal de requisitos pede o valor.

Existem duas formas de resolver, com efeitos diferentes:

### Opção A — Remover a exigência de "value" apenas na coluna Lead
Simples correção de dados. `Orçamento enviado` continua exigindo `value` como esperado.

```sql
DELETE FROM column_entry_requirements
WHERE column_id = '856f1e65-53d3-4a28-8e22-66b4f6ac0b4e'  -- Lead / Vendas
  AND field_name = 'value';
```

### Opção B — Nunca exigir requisitos em movimentações "para trás"
Alteração de comportamento em `KanbanBoard.tsx`: se a `position` da coluna de destino for menor ou igual à da coluna atual do card, pula a checagem de `column_entry_requirements`. Assim, retornos a etapas anteriores nunca disparam o modal, independentemente de como estejam configuradas as colunas.

## Recomendação

Opção A é a mais segura e alinhada ao que o usuário descreve ("esse campo só é obrigatório se eu mover para orçamento enviado"). A Opção B mudaria o comportamento global do sistema, o que pode não ser desejado se em algum funil futuro faça sentido exigir dados ao voltar.

Qual seguimos? Se preferir, posso aplicar **A** e ainda assim adicionar **B** como reforço.