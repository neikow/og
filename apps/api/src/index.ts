import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'
import { runMigrations } from './db/migrate.js'
import { env } from './env.js'
import { errorMiddleware } from './middleware/error.js'
import { apiKeysRouter } from './routes/api-keys.js'
import { assetsRouter } from './routes/assets.js'
import { authRouter } from './routes/auth.js'
import { fontsRouter } from './routes/fonts.js'
import { ogRouter } from './routes/og.js'
import { previewRouter } from './routes/preview.js'
import { templatesRouter } from './routes/templates.js'

// Run database migrations before accepting any requests
runMigrations()

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

// Version info — used by the frontend to check for updates.
// Returns the running image tag/sha and whether a newer `latest` exists on GHCR.
app.get('/health/version', async (c) => {
  const GHCR_IMAGE = 'neikow/og'
  const tag = env.IMAGE_TAG
  const sha = env.IMAGE_SHA

  // Only check for updates when running a real published image (not local dev)
  const isPublished = tag !== 'dev' && tag !== ''
  let updateAvailable = false
  let latestSha: string | null = null

  if (isPublished && sha) {
    try {
      // Fetch the manifest for the `latest` tag via GHCR OCI API (anonymous, public)
      const manifestRes = await fetch(
        `https://ghcr.io/v2/${GHCR_IMAGE}/manifests/latest`,
        {
          headers: {
            Accept: [
              'application/vnd.oci.image.index.v1+json',
              'application/vnd.oci.image.manifest.v1+json',
              'application/vnd.docker.distribution.manifest.list.v2+json',
              'application/vnd.docker.distribution.manifest.v2+json',
            ].join(','),
          },
          signal: AbortSignal.timeout(5000),
        },
      )

      if (manifestRes.ok) {
        const manifest = await manifestRes.json() as {
          annotations?: Record<string, string>
          config?: { digest: string }
        }
        // OCI image index stores labels in annotations
        latestSha = manifest.annotations?.['org.opencontainers.image.revision'] ?? null
        if (latestSha && latestSha !== sha) {
          updateAvailable = true
        }
      }
    }
    catch {
      // Network failure — silently skip update check
    }
  }

  return c.json({
    tag,
    sha: sha || null,
    updateAvailable,
    latestSha,
  })
})

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
