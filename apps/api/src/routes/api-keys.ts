import type { CreateApiKeyInput } from '@og/shared'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client.js'
import { apiKeys } from '../db/schema.js'
import { sessionMiddleware } from '../middleware/session.js'

export const apiKeysRouter = new Hono()

apiKeysRouter.use('*', sessionMiddleware)

// GET /api-keys
apiKeysRouter.get('/', async (c) => {
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      tagRestrictions: apiKeys.tagRestrictions,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .orderBy(apiKeys.createdAt)

  return c.json(rows)
})

// POST /api-keys
apiKeysRouter.post('/', async (c) => {
  const body = await c.req.json<CreateApiKeyInput>()

  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 400)
  }

  // Generate a secure random key: prefix + 32 random bytes
  const rawKey = `og_${randomBytes(32).toString('hex')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const id = randomUUID()
  const now = new Date().toISOString()

  await db.insert(apiKeys).values({
    id,
    name: body.name.trim(),
    keyHash,
    tagRestrictions: body.tagRestrictions ?? [],
    createdAt: now,
    lastUsedAt: null,
  })

  return c.json(
    {
      apiKey: { id, name: body.name.trim(), tagRestrictions: body.tagRestrictions ?? [], createdAt: now, lastUsedAt: null },
      rawKey, // Shown only once
    },
    201,
  )
})

// DELETE /api-keys/:id
apiKeysRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const [existing] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1)

  if (!existing)
    return c.json({ error: 'API key not found' }, 404)

  await db.delete(apiKeys).where(eq(apiKeys.id, id))
  return c.json({ ok: true })
})
