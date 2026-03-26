

# Transformar em PWA Instalável

## Visão geral

Tornar o app instalável (Add to Home Screen) em dispositivos móveis e desktop usando um Web App Manifest simples, sem service worker (que causa problemas no preview do Lovable).

## Nota importante

Funcionalidades PWA (prompt de instalação) só funcionarão na versão publicada, não no preview do editor Lovable.

## 1. `public/manifest.json` — Novo arquivo

Criar manifest com:
- `name`: "CRM Elisa"
- `short_name`: "CRM Elisa"
- `display`: "standalone"
- `start_url`: "/"
- `theme_color`: "#1d76cf" (cor do logo)
- `background_color`: "#ffffff"
- Ícones: referenciar SVG existente + gerar PNGs (192x192, 512x512)

## 2. `public/` — Ícones PNG

Criar ícones PNG a partir do favicon.svg existente:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

## 3. `index.html` — Meta tags PWA

Adicionar:
- `<link rel="manifest" href="/manifest.json">`
- `<meta name="theme-color" content="#1d76cf">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- `<link rel="apple-touch-icon" href="/icon-192.png">`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `public/manifest.json` | Criar manifest do PWA |
| `public/icon-192.png` | Criar ícone 192x192 |
| `public/icon-512.png` | Criar ícone 512x512 |
| `index.html` | Adicionar meta tags e link do manifest |

