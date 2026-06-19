import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: proxy the catalog, card images, and the agent API to a local (ungated) browse
// instance so the React app gets real data with no auth friction in development.
const BROWSE = 'http://127.0.0.1:8790'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': BROWSE,
      '/catalog-sample.json': BROWSE,
      '/assets/cards': BROWSE,
    },
  },
})
