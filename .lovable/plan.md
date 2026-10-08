# Travas de desbloqueio de colunas no Kanban

## O que muda para você
- Em Configurações do CRM > Funis, cada coluna ganha a seção **"Trava de desbloqueio"**.
- Você liga a trava e escolhe a **condição** para a coluna abrir, olhando a coluna anterior (ou outra que você escolher):
  1. **Coluna esvaziada** — todos os cards foram movidos para frente ou desqualificados/arquivados.
  2. **Tarefas do dia concluídas** — nenhum card da coluna tem tarefa pendente com prazo até hoje.
  3. **Cor do dia definida** — todos os cards da coluna estão com bolinha verde hoje (ou com as cores que você marcar como aceitas).
  4. **Combinação** — você pode marcar mais de uma condição; a coluna só abre quando todas forem cumpridas.
- A trava é **individual por vendedor**: cada um destrava as suas colunas olhando apenas os próprios cards.
- Trava **renova todo dia**: na virada do dia (horário de Brasília) tudo volta a travar, exceto a primeira coluna.
- Colunas sem trava ficam sempre abertas. Admin não é bloqueado (vê um cadeado apenas como aviso).

## Como aparece no Kanban
- Coluna travada fica acinzentada, com cadeado no topo e a mensagem do que falta (ex.: "Faltam 3 leads em 'Lead'").
- Cards da coluna travada não abrem nem podem ser arrastados; não dá para soltar cards nela nem criar negociação nela.
- Quando a condição é cumprida, a coluna destrava na hora.

## Detalhes técnicos
- Migração: novas colunas em `funnel_columns` (sem quebrar nada):
  `lock_enabled boolean default false`, `lock_depends_on_column_id uuid null` (padrão = coluna anterior por posição), `lock_conditions text[] default '{}'` (valores: `empty`, `tasks_done`, `daily_color`), `lock_accepted_colors text[] default '{green}'`.
- Avaliação no front em `KanbanBoard.tsx`: para cada coluna, em ordem de posição, calcula `isLocked` usando os deals do vendedor logado (filtrados por `assigned_to`), `deal_tasks` pendentes com `deadline_at <= fim de hoje` e `deal_daily_color` de hoje — dados já carregados no board. Encadeamento: se a coluna de dependência está travada, a dependente também fica.
- "Esvaziada" considera cards não arquivados do vendedor na coluna de dependência.
- `KanbanColumn.tsx`: props `locked` e `lockReason`; estilo opaco, cadeado, desativa botão +, droppable desligado; `DealCard` com `disabled` no sortable e clique bloqueado.
- `onDragEnd` rejeita destino travado com toast (proteção extra).
- Configuração em `FunnelColumnList.tsx`: switch, seletor da coluna de dependência, checkboxes de condições e cores aceitas.
- Bypass para admin via `get_my_role`.
