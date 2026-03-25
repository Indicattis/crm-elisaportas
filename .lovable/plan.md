

# Hub de Configuração com Cards de Navegação

## Resumo

Transformar `/crm-config` de tabs diretas para um hub com cards clicáveis ("Funis" e "Tags"). Ao clicar em um card, o conteúdo correspondente aparece. Um botão de voltar permite retornar à tela inicial do hub.

## Implementação

**`src/pages/CrmConfig.tsx`**

- Adicionar estado `activeSection: null | "funnels" | "tags"` (inicia `null`)
- Quando `null`: mostrar grid de cards com ícones (ex: `GitBranch` para Funis, `Tag` para Tags) — visual de hub
- Quando `"funnels"`: mostrar conteúdo atual de funis com botão voltar
- Quando `"tags"`: mostrar `TagManager` com botão voltar
- Remover `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`

Layout do hub:
```text
Configuração do CRM

┌──────────────┐  ┌──────────────┐
│  🔀 Funis    │  │  🏷️ Tags    │
│  Gerencie    │  │  Gerencie    │
│  seus funis  │  │  suas tags   │
└──────────────┘  └──────────────┘
```

Ao clicar em um card:
```text
← Voltar
Funis (ou Tags)
[conteúdo existente]
```

