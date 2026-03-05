import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it } from 'vitest'
import { templates } from '../../db/schema'
import {
  _cache,
  _templateKeyIndex,
  buildCacheKey,
  cacheGet,
} from '../../services/cache'
import { createTestDb } from '../helpers/db'

const NOW = new Date().toISOString()

describe('gET /og/:uuid', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()
    _cache.clear()
    _templateKeyIndex.clear()
  })

  function createOgApp() {
    const app = new Hono()

    // Mock API key middleware — always passes
    app.use('*', async (c, next) => {
      c.set('apiKeyId', 'test-key-id')
      await next()
    })

    app.get('/:uuid', async (c) => {
      const uuid = c.req.param('uuid')
      const [template] = await db
        .select()
        .from(templates)
        .where(eq(templates.id, uuid))
        .limit(1)
        .catch(() => [null])

      if (!template)
        return c.json({ error: 'Template not found' }, 404)

      const rawParams = c.req.query()
      const schema = template.variableSchema as Array<{ name: string, required: boolean, default?: string, type: string }>

      for (const v of schema) {
        if (v.required && !rawParams[v.name] && v.default === undefined) {
          return c.json({ error: `Missing required variable: "${v.name}"` }, 400)
        }
      }

      // Check cache
      const cacheKey = buildCacheKey(uuid, rawParams as Record<string, string>)
      const cached = cacheGet(cacheKey)
      if (cached) {
        return new Response(cached, {
          headers: { 'Content-Type': 'image/png', 'X-Cache': 'HIT' },
        })
      }

      return c.json({ rendered: true, templateId: uuid })
    })

    return app
  }

  it('returns 404 for unknown template UUID', async () => {
    const app = createOgApp()
    const res = await app.request('/no-such-uuid')
    expect(res.status).toBe(404)
  })

  it('returns 400 when required variable is missing', async () => {
    const id = randomUUID()
    await db.insert(templates).values({
      id,
      name: 'Test',
      code: '',
      variableSchema: [{ name: 'title', type: 'string', required: true }],
      createdAt: NOW,
      updatedAt: NOW,
    })

    const app = createOgApp()
    const res = await app.request(`/${id}`)
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('title')
  })

  it('serves from cache on second request', async () => {
    const id = randomUUID()
    const cacheKey = buildCacheKey(id, { title: 'Hello' })
    const fakePng = Buffer.from('fake-png-data')
    const { cacheSetWithIndex } = await import('../../services/cache')
    cacheSetWithIndex(id, cacheKey, fakePng)

    const app = createOgApp()
    // The template doesn't exist in DB but cache is hit first
    await db.insert(templates).values({
      id,
      name: 'T',
      code: '',
      variableSchema: [],
      createdAt: NOW,
      updatedAt: NOW,
    })

    const res = await app.request(`/${id}?title=Hello`)
    const xCache = res.headers.get('X-Cache')
    expect(xCache).toBe('HIT')
  })
})
