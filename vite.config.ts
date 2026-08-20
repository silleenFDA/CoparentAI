import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` doit correspondre au nom du dépôt GitHub pour que
// la publication sur GitHub Pages trouve bien les fichiers.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/CoparentAI/' : '/',
})
