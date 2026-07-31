import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: proxy the agent API to a local (ungated) browse instance. Catalogue payloads
// and card images ship from web/public and must stay on Vite; proxying /assets made
// a healthy local catalogue look like its imagery was missing whenever Anko was off.
const BROWSE = 'http://127.0.0.1:8790'
const PILOT_STORE = globalThis.process?.env?.VITE_PILOT_STORE_PROXY || BROWSE

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
      '/api/store': PILOT_STORE,
      '/api': BROWSE,
    },
  },
})
