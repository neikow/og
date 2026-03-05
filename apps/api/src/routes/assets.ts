import type { Asset } from '@og/shared'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { assets } from '../db/schema'
import { env } from '../env'
import { sessionMiddleware } from '../middleware/session'

const IDENTIFIER_REGEX = /^[a-z_]\w*$/i

export const assetsRouter = new Hono()

// ─── Allowed image MIME types ─────────────────────────────────────────────────

const ALLOWED_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

function assetToDto(row: typeof assets.$inferSelect): Asset {
  return {
    id: row.id,
    identifier: row.identifier,
    filename: row.filename,
    mimeType: row.mimeType,
    url: `/assets/file/${row.id}`,
    createdAt: row.createdAt,
  }
}

// GET /assets
assetsRouter.get('/', sessionMiddleware, async (c) => {
  const rows = await db.select().from(assets).orderBy(assets.createdAt)
  return c.json(rows.map(assetToDto))
})

// POST /assets — multipart upload: fields `file` + `identifier`
assetsRouter.post('/', sessionMiddleware, async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const identifier = (formData.get('identifier') as string | null)?.trim()

  if (!file || typeof file === 'string') {
    return c.json({ error: 'file field is required' }, 400)
  }
  if (!identifier) {
    return c.json({ error: 'identifier field is required' }, 400)
  }
  if (!IDENTIFIER_REGEX.test(identifier)) {
    return c.json(
      { error: 'identifier must be a valid JavaScript identifier (letters, digits, underscores; cannot start with a digit)' },
      400,
    )
  }

  const ext = extname(file.name).toLowerCase()
  const mimeType = ALLOWED_MIME[ext]
  if (!mimeType) {
    return c.json(
      { error: `Unsupported file type "${ext}". Allowed: ${Object.keys(ALLOWED_MIME).join(', ')}` },
      400,
    )
  }

  // Check identifier uniqueness
  const [existing] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.identifier, identifier))
    .limit(1)
  if (existing) {
    return c.json({ error: `An asset with identifier "${identifier}" already exists` }, 409)
  }

  const id = randomUUID()
  const filename = file.name
  const buf = Buffer.from(await file.arrayBuffer())

  mkdirSync(env.ASSET_DIR, { recursive: true })
  const filePath = join(env.ASSET_DIR, `${id}${ext}`)
  writeFileSync(filePath, buf)

  const now = new Date().toISOString()
  await db.insert(assets).values({ id, identifier, filename, mimeType, filePath, createdAt: now })

  const [row] = await db.select().from(assets).where(eq(assets.id, id)).limit(1)
  return c.json(assetToDto(row), 201)
})

// DELETE /assets/:id
assetsRouter.delete('/:id', sessionMiddleware, async (c) => {
  const id = c.req.param('id')

  if (!id) {
    return c.json({ error: 'id parameter is required' }, 400)
  }

  const [row] = await db.select().from(assets).where(eq(assets.id, id)).limit(1)
  if (!row)
    return c.json({ error: 'Asset not found' }, 404)

  try {
    unlinkSync(row.filePath)
  }
  catch { /* already gone */ }

  await db.delete(assets).where(eq(assets.id, id))
  return c.json({ ok: true })
})

// GET /assets/file/:id — serve the raw image bytes (requires session auth)
assetsRouter.get('/file/:id', async (c) => {
  const id = c.req.param('id')

  const [row] = await db.select().from(assets).where(eq(assets.id, id)).limit(1)
  if (!row)
    return c.json({ error: 'Asset not found' }, 404)

  const buf = readFileSync(row.filePath)
  return new Response(buf, {
    headers: {
      'Content-Type': row.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})
