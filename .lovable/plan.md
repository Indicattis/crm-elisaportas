# Monitoramento do CRM

Nova página `/monitoramento` com botão no header, onde o administrador registra, dia a dia e por vendedor, se o CRM foi concluído e em que horário — com contagem automática das bolinhas verde/amarela/vermelha do dia.

## Acesso
- Botão "Monitoramento" no header (desktop e barra inferior mobile), visível para todos os usuários logados.
- Admin: vê e edita todos os vendedores.
- Vendedor: vê somente os próprios registros, sem edição.

## Tela
- Calendário mensal no topo (mês navegável) com marcação visual dos dias já preenchidos.
- Ao selecionar um dia, aparece a lista de vendedores ativos com, por linha:
  - Nome do vendedor.
  - Botão Sim/Não para "CRM concluído".
  - Campo de hora da conclusão (habilitado quando "Sim").
  - Três indicadores coloridos com a contagem de bolinhas verdes, amarelas e vermelhas do dia.
- Salvamento imediato ao alterar (com feedback de toast).
- Resumo do dia no rodapé: quantos vendedores concluíram, total de bolinhas por cor.

## Contagem das bolinhas
Calculada ao vivo a partir das cores diárias das negociações, agrupadas pelo responsável da negociação (campo de delegação). Negociações sem responsável ficam fora da contagem por vendedor, mas entram no total geral do dia.

## Detalhes técnicos
- Nova tabela `public.crm_monitoring` com: `seller_id`, `date`, `completed` (boolean), `completed_time` (time, nulo quando não concluído), timestamps, `updated_by`; índice único em (`seller_id`, `date`).
- GRANTs para `authenticated` e `service_role`; RLS:
  - leitura: admin vê tudo, vendedor vê apenas `seller_id = auth.uid()`;
  - inserir/atualizar: apenas admin (`has_role`).
- Trigger `update_updated_at_column` na tabela.
- Contagem: consulta em `deal_daily_color` do dia unida a `deals` para obter `assigned_to`, agregada por vendedor e cor no cliente.
- Nova rota `/monitoramento` em `App.tsx` dentro do `AppLayout` autenticado; página `src/pages/Monitoring.tsx` seguindo o padrão visual glassmorphism das páginas `/vendas` e `/relatorios` (container `max-w-7xl mx-auto p-6`, fundo `bg-muted/40`).
