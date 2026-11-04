import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// `base` coincide con el nombre del repositorio para publicar en GitHub Pages.
export default defineConfig({
  base: '/MVP-CafeRaiz/',
  plugins: [react(), tailwindcss()],
})
