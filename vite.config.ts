import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server origin comes from .env (VITE_API_URL), so the proxy target
  // is configurable per environment instead of hardcoded.
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://127.0.0.1:3000'

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    server: {
      // Calls to /api are proxied to the Express server during development,
      // so the SPA and API share an origin (no CORS needed).
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
