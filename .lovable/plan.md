
# Corrigir opção de “baixar app” no domínio (PWA)

## Diagnóstico (com base no código atual)
O projeto já tem:
- `vite-plugin-pwa` configurado em `vite.config.ts`
- `manifest.json` e ícones

Mas em `src/main.tsx` **não há registro do service worker** (`registerSW`), então o navegador não ativa o PWA completo e não exibe a instalação de forma confiável.

## Plano de implementação

1. **Registrar o service worker em produção**
   - Arquivo: `src/main.tsx`
   - Adicionar `import { registerSW } from "virtual:pwa-register"`.
   - Manter o guard atual de preview/iframe:
     - Se `isPreviewHost || isInIframe`: continuar desregistrando SW.
     - Caso contrário: chamar `registerSW({ immediate: true })`.

2. **Garantir tipagem do módulo virtual**
   - Arquivo: `src/vite-env.d.ts`
   - Adicionar referência:
     - `/// <reference types="vite-plugin-pwa/client" />`
   - Evita erro de TypeScript ao importar `virtual:pwa-register`.

3. **Adicionar opção explícita de instalação no app (recomendado)**
   - Criar hook `usePwaInstall` (ex.: `src/hooks/use-pwa-install.ts`) para capturar `beforeinstallprompt` e `appinstalled`.
   - Integrar no `src/components/Header.tsx` dentro do menu do usuário:
     - novo item: **“Baixar App”** (com ícone Download)
     - mostrar apenas quando `beforeinstallprompt` estiver disponível
     - ao clicar, chamar `prompt()` e tratar resultado.
   - Isso resolve o cenário em que o browser não mostra banner automático.

4. **Validação pós-deploy na Vercel**
   - Fazer novo deploy e testar em `https://crm.elisaportas.com`.
   - Confirmar no DevTools > Application:
     - Service Worker ativo e controlando a página
     - Manifest válido
   - Confirmar que o item “Baixar App” aparece e instala o app.

## Arquivos afetados
- `src/main.tsx` (registro de SW em produção)
- `src/vite-env.d.ts` (tipagem do PWA client)
- `src/hooks/use-pwa-install.ts` (novo hook)
- `src/components/Header.tsx` (item “Baixar App” no menu)

## Resultado esperado
- O app passa a exibir uma opção real de instalação/“download” no domínio de produção.
- Instalação funcional em desktop/mobile compatíveis.
- Preview do editor continua protegido contra cache de service worker.
