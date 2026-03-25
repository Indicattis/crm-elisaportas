

# Logo branca no modo escuro

## Alterações

1. **Copiar a logo branca** para `src/assets/logo-white.png`

2. **`src/components/Header.tsx`**: Importar a logo branca e alternar com base no tema:
   - Importar `import logoWhite from "@/assets/logo-white.png"`
   - Na tag `<img>`, usar `src={theme === "dark" ? logoWhite : logo}`

