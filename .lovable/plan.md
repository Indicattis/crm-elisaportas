## Adicionar opção "Data de retorno" na ordenação das colunas

**`src/components/FunnelColumnList.tsx`**
- Adicionar `<SelectItem value="return_date">Data de retorno</SelectItem>` no Select de ordenação (após "Próxima tarefa").

**`src/components/KanbanBoard.tsx`**
- No `.sort(...)` da listagem de deals, adicionar branch:
  ```
  if (order === "return_date") {
    const tA = a.return_date ? new Date(a.return_date).getTime() : Infinity;
    const tB = b.return_date ? new Date(b.return_date).getTime() : Infinity;
    return tA - tB;
  }
  ```
  Deals sem `return_date` vão para o final (ascendente: retornos mais próximos primeiro).

Sem migração de banco — `sort_order` já é texto livre.
