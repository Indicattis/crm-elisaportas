

# PWA Instalável com Service Worker (Vercel)

## Problema

O Chrome exige um **service worker** registrado para mostrar o prompt de instalação. Atualmente o app só tem o `manifest.json`, que não é suficiente.

## Solução

Adicionar `vite-plugin-pwa` com guard para não interferir no preview do Lovable.

## 1. Instalar dependência

```
npm install vite-plugin-pwa
```

## 2. `vite.config.ts` — Adicionar VitePWA

Adicionar o plugin com `devOptions: { enabled: false }` e `navigateFallbackDenylist` para evitar conflitos:

```ts
import { VitePWA } from 'vite-plugin-pwa'

// No array de plugins:
VitePWA({
  registerType: 'autoUpdate',
  devOptions: { enabled: false },
  workbox: {
    navigateFallbackDenylist: [/^\/~oauth/],
  },
  manifest: {
    name: 'CRM Elisa',
    short_name: 'CRM Elisa',
    start_url: '/',
    display: 'standalone',
    theme_color: '#1d76cf',
    background_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  }
})
```

## 3. `src/main.tsx` — Guard contra iframe/preview

Adicionar guard no entry point para desregistrar service workers no preview do Lovable:

```ts
const isInIframe = (() => {
  try { return window.self !== window.top; }
  catch { return true; }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then(regs =>
    regs.forEach(r => r.unregister())
  );
}
```

## Nota importante

- O prompt de instalação só aparecerá no domínio publicado (`crm.elisaportas.com`), nunca no preview do Lovable
- Após deploy na Vercel, o service worker será gerado automaticamente pelo build

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `package.json` | Adicionar `vite-plugin-pwa` |
| `vite.config.ts` | Configurar VitePWA |
| `src/main.tsx` | Adicionar guard de service worker |

