import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      // /templates is both an API prefix AND a client-side route prefix.
      // Proxy only requests that look like API calls (XHR/fetch or Accept: json).
      '/templates': {
        target: 'http://localhost:3000',
        bypass(req) {
          const accept = req.headers['accept'] ?? ''
          const isNavigate = !req.headers['x-requested-with'] && accept.includes('text/html')
          // Let browser navigations fall through to the SPA (index.html)
          if (isNavigate) return req.url
          return null // proxy it
        },
      },
      '/og': 'http://localhost:3000',
      '/preview': 'http://localhost:3000',
      '/api-keys': 'http://localhost:3000',
      '/fonts': 'http://localhost:3000',
      '/assets': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  optimizeDeps: {
    // Monaco needs these excluded from pre-bundling to load workers correctly
    exclude: ['monaco-editor'],
  },
  worker: {
    format: 'es',
  },
})
