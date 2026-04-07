

# Padronizar Estado e Cidade com SelectBox Dependentes

## Visão geral

Substituir os campos de texto livre de Estado e Cidade por selectboxes encadeados: o usuário seleciona o estado (UF) e, com base nisso, aparece a lista de cidades daquele estado. Aplicar em 3 locais: DealDialog (cadastro/edição), DealDetailDialog (modal inline) e LeadForm (formulário público).

## 1. Criar componente `src/components/StateCitySelect.tsx`

Componente reutilizável que:
- Contém os dados dos 26 estados + DF como constante (sigla + nome)
- Contém um mapa de cidades por UF (dados estáticos dos municípios brasileiros — lista completa dos ~5.570 municípios do IBGE, agrupados por UF)
- Recebe props: `state`, `city`, `onStateChange`, `onCityChange`, `disabled?`
- Renderiza dois `Select`: primeiro para UF, segundo para cidade (habilitado somente quando UF selecionado)
- Ao trocar o estado, limpa a cidade automaticamente
- Suporte a busca/filtro dentro do select de cidades (usando Command/Combobox pattern dado o volume de cidades)

**Nota sobre volume de dados**: como são ~5.570 municípios, o arquivo de dados será grande (~150KB). Será criado como `src/data/brazilian-cities.ts` separado para manter organização. O select de cidades usará um Combobox com busca (Popover + Command) para que o usuário possa digitar e filtrar rapidamente.

## 2. Atualizar `src/components/DealDialog.tsx`

- Substituir os dois `<Input>` de Estado e Cidade pelo novo `<StateCitySelect>`
- Passar `state`, `city`, `onStateChange`, `onCityChange` vinculados ao estado local existente

## 3. Atualizar `src/components/DealDetailDialog.tsx`

- Na seção de contato (inline editing de state/city), substituir os `<Input>` por `<StateCitySelect>` quando em modo de edição
- Manter o comportamento de salvar ao selecionar (onBlur ou onChange direto)

## 4. Atualizar `src/pages/LeadForm.tsx`

- Substituir os campos de texto de estado e cidade pelo `<StateCitySelect>`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/data/brazilian-cities.ts` | Novo — dados de estados e cidades do Brasil |
| `src/components/StateCitySelect.tsx` | Novo — componente reutilizável de seleção estado/cidade |
| `src/components/DealDialog.tsx` | Substituir inputs por StateCitySelect |
| `src/components/DealDetailDialog.tsx` | Substituir inputs inline por StateCitySelect |
| `src/pages/LeadForm.tsx` | Substituir inputs por StateCitySelect |

