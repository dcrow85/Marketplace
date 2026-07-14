import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: proxy card images and the agent API to a local (ungated) browse instance.
// Catalog payloads are shipped from web/public so each catalog tab can load even
// when the browse server is offline.
const BROWSE = 'http://127.0.0.1:8790'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        name: 'CairnApp',
        // Keep the production entry visibly first-party. Some privacy extensions
        // block generic /assets/index-<hash>.js URLs on the custom domain.
        entryFileNames: 'cairn-site-[hash].js',
      },
    },
  },
  server: {
    proxy: {
      '/api': BROWSE,
      '/assets/cards': BROWSE,
    },
  },
})
