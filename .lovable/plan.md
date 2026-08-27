# Ajustes na página /monitoramento

## 1. Exibir a foto do vendedor
- Buscar `avatar_url` junto de `full_name` na consulta de `profiles` (já feita em `src/pages/Monitoring.tsx`).
- Adicionar `avatar_url` à interface `Seller`.
- Na linha de cada vendedor, exibir a foto (avatar circular) antes do nome. Se não houver foto, usar um fallback com iniciais (estilo já usado no app).

## 2. Remover as bolas coloridas do cadastro
- Remover os `ColorPill` (verde/amarela/vermelha) exibidos em cada linha de vendedor.
- Remover o rodapé "Total de bolinhas no dia" com os totais.
- Remover todo o estado e a lógica de contagem de `deal_daily_color` (busca em `deal_daily_color` + `deals.assigned_to`, estados `counts`, `unassigned`, `dayTotals`), deixando a página mais leve.

## 3. Cores do calendário
Definições (confirmadas):
- **Verde** = dia em que **todos** os vendedores marcaram "Sim".
- **Vermelho** = dia com registros mas em que **pelo menos um** vendedor não concluiu.
- **Azul** = dia atual, **apenas se ainda não houver nenhum registro** para ele.

Implementação:
- Substituir o estado `filledDates` por dois conjuntos: `completedDates` (verde) e `incompleteDates` (vermelho).
- Cálculo: buscar todos os registros de `crm_monitoring` (com `completed`) e agrupar por data. Para cada data, comparar `concluídos == total de vendedores ativos`. Considerar "todos os vendedores" = todos os sellers ativos (mesma lista carregada na página), não apenas os que têm registro — assim um dia sem registro de algum vendedor conta como não concluído (vermelho) se já houver ao menos um registro.
- O dia atual (hoje) entra como azul apenas se não pertencer a nenhum dos dois conjuntos acima.
- Usar `modifiers` do `react-day-picker` (`completed`, `incomplete`, `todayEmpty`) com `modifiersClassNames`:
  - `completed` → fundo verde (`bg-emerald-500 text-white`).
  - `incomplete` → fundo vermelho (`bg-red-500 text-white`).
  - `todayEmpty` → fundo azul (`bg-primary text-primary-foreground`), aplicado ao dia atual sem registros.
- O dia selecionado continua destacado normalmente pelo `day_selected` do Calendar.

## Detalhes técnicos
- Arquivo alterado: `src/pages/Monitoring.tsx` (apenas frontend; sem mudança no banco — `profiles.avatar_url` e `crm_monitoring.completed` já existem).
- Sem migration necessária.
- Sempre respeitar RLS/GRANTs existentes (sem mudanças).
