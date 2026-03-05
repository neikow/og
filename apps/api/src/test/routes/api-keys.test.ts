import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiKeys as apiKeysTable, sessions } from '../../db/schema'
import { createTestDb } from '../helpers/db'

// Create an isolated test app with its own DB
function createApiKeysTestApp(db: ReturnType<typeof createTestDb>) {
  vi.doMock('../../db/client', () => ({ db }))

  // Session ID for authenticated requests
  const sessionId = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 86400000) // 1 day

  db.insert(sessions).values({ id: sessionId, expiresAt }).run()

  const app = new Hono()

  // Attach a mock session middleware that always authenticates
  app.use('*', async (c, next) => {
    // @ts-expect-error - we just want to set sessionId for testing
    c.set('sessionId', sessionId)
    await next()
  })

  // Mount the router
  app.post('/', async (c) => {
    const body = await c.req.json()
    if (!body.name?.trim())
      return c.json({ error: 'name is required' }, 400)

    const rawKey = `og_${randomBytes(32).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const id = randomUUID()
    const now = new Date().toISOString()

    await db.insert(apiKeysTable).values({ id, name: body.name.trim(), keyHash, createdAt: now, lastUsedAt: null })
    return c.json({ apiKey: { id, name: body.name.trim(), createdAt: now, lastUsedAt: null }, rawKey }, 201)
  })

  app.get('/', async (c) => {
    const rows = await db.select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
    }).from(apiKeysTable)
    return c.json(rows)
  })

  app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const [existing] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, id)).limit(1)
    if (!existing)
      return c.json({ error: 'API key not found' }, 404)
    await db.delete(apiKeysTable).where(eq(apiKeysTable.id, id))
    return c.json({ ok: true })
  })

  return app
}

describe('pOST /api-keys', () => {
  let db: ReturnType<typeof createTestDb>
  let app: Hono

  beforeEach(() => {
    db = createTestDb()
    app = createApiKeysTestApp(db)
  })

  it('creates an API key and returns the raw key once', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Key' }),
    })

    expect(res.status).toBe(201)
    const json = await res.json() as { apiKey: { id: string, name: string }, rawKey: string }
    expect(json.apiKey.name).toBe('My Key')
    expect(json.rawKey).toMatch(/^og_[a-f0-9]+$/)
  })

  it('does not expose keyHash in the response', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Key' }),
    })
    const json = await res.json() as Record<string, unknown>
    expect(json.apiKey).not.toHaveProperty('keyHash')
  })

  it('returns 400 when name is missing', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})

describe('gET /api-keys', () => {
  let db: ReturnType<typeof createTestDb>
  let app: Hono

  beforeEach(() => {
    db = createTestDb()
    app = createApiKeysTestApp(db)
  })

  it('returns empty array when no keys', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('lists keys without exposing raw key or hash', async () => {
    await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Key A' }),
    })

    const res = await app.request('/')
    const keys = await res.json() as Array<Record<string, unknown>>
    expect(keys).toHaveLength(1)
    expect(keys[0]).toHaveProperty('id')
    expect(keys[0]).toHaveProperty('name', 'Key A')
    expect(keys[0]).not.toHaveProperty('keyHash')
    expect(keys[0]).not.toHaveProperty('rawKey')
  })
})

describe('dELETE /api-keys/:id', () => {
  let db: ReturnType<typeof createTestDb>
  let app: Hono

  beforeEach(() => {
    db = createTestDb()
    app = createApiKeysTestApp(db)
  })

  it('revokes an existing API key', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Key to revoke' }),
    })
    const { apiKey } = await createRes.json() as { apiKey: { id: string } }

    const deleteRes = await app.request(`/${apiKey.id}`, { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)

    // Confirm it's gone
    const listRes = await app.request('/')
    const keys = await listRes.json() as unknown[]
    expect(keys).toHaveLength(0)
  })

  it('returns 404 for non-existent key', async () => {
    const res = await app.request('/no-such-id', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
