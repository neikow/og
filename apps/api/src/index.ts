import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'
import { env } from './env'
import { errorMiddleware } from './middleware/error'
import { apiKeysRouter } from './routes/api-keys'
import { assetsRouter } from './routes/assets'
import { authRouter } from './routes/auth'
import { fontsRouter } from './routes/fonts'
import { ogRouter } from './routes/og'
import { previewRouter } from './routes/preview'
import { templatesRouter } from './routes/templates'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', errorMiddleware)
app.use(
  '*',
  cors({
    origin: env.FRONTEND_URL,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

// ETag for OG image routes
app.use('/og/*', etag())

// API routes
app.route('/auth', authRouter)
app.route('/templates', templatesRouter)
app.route('/og', ogRouter)
app.route('/preview', previewRouter)
app.route('/api-keys', apiKeysRouter)
app.route('/fonts', fontsRouter)
app.route('/assets', assetsRouter)

// Health check
app.get('/health', c => c.json({ ok: true, ts: new Date().toISOString() }))

// ─── Static file serving (production) ────────────────────────────────────────
// In production the Vite build is copied to ./public next to the compiled API.
// All routes not matched above serve the SPA's index.html so client-side
// routing works correctly.
if (env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './public' }))
  app.use('/*', serveStatic({ path: './public/index.html' }))
}

// 404 (only reached in development or for truly unknown API routes)
app.notFound(c => c.json({ error: 'Not found' }, 404))

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.warn(`API server running at http://localhost:${info.port}`)
  },
)

export { app }
