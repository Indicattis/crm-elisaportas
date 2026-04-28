## Adicionar ícones de letras ao seletor de canais

Em `/crm-config` → Canais de Aquisição, o seletor atual oferece apenas ícones gráficos (Google, Facebook, Megafone, etc.). Vou adicionar 26 opções extras de "ícone com letra" (A a Z), permitindo identificar canais por inicial.

### Como vai funcionar

- O `ChannelIconPicker` ganha uma seção extra "Letras" com um grid das 26 letras.
- Cada letra é renderizada como um SVG inline (mesmo tamanho/estilo dos outros ícones), usando `currentColor` para herdar o tema (light/dark).
- Os IDs ficam no padrão `letter-a`, `letter-b`, …, `letter-z` — assim já são salvos como qualquer outro `icon` na tabela `acquisition_channels` sem migração.
- O `getChannelIcon` continua resolvendo qualquer ID, então cards do Kanban (`DealCard`) e o gerenciador (`AcquisitionChannelManager`) renderizam automaticamente.

### Mudanças técnicas

- `src/lib/channel-icons.tsx`
  - Novo componente `LetterIcon({ char })` que devolve um SVG quadrado com a letra centralizada em negrito (font-weight 700, fonte herdada do tema "Indivisible").
  - Gerar dinamicamente 26 entradas `{ id: "letter-x", label: "Letra X", icon: LetterIcon }` e adicioná-las ao final de `CHANNEL_ICONS`.

- `src/components/ChannelIconPicker.tsx`
  - Separar visualmente em dois grupos com um pequeno título: "Ícones" (atuais) e "Letras" (A–Z).
  - Manter o mesmo grid de 7 colunas e o estado de seleção.

Sem mudanças de banco e sem impacto em dados existentes.