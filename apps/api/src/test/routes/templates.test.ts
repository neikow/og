import { randomBytes, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it } from 'vitest'
import { sessions, templateFonts, templates } from '../../db/schema'
import { createTestDb } from '../helpers/db'

const NOW = new Date().toISOString()

function createTemplatesTestApp(db: ReturnType<typeof createTestDb>) {
  const sessionId = randomBytes(16).toString('hex')
  db.insert(sessions).values({
    id: sessionId,
    expiresAt: new Date(Date.now() + 86400000),
  }).run()

  const app = new Hono()
  app.use('*', async (c, next) => {
    // @ts-expect-error - we just want to set a value for the session middleware to pick up, we don't need the full session object
    c.set('sessionId', sessionId)
    await next()
  })

  // GET /
  app.get('/', async (c) => {
    const rows = await db.select().from(templates)
    return c.json(rows)
  })

  // POST /
  app.post('/', async (c) => {
    const body = await c.req.json()
    if (!body.name?.trim())
      return c.json({ error: 'name is required' }, 400)
    const id = randomUUID()
    await db.insert(templates).values({
      id,
      name: body.name.trim(),
      code: body.code ?? '',
      variableSchema: body.variableSchema ?? [],
      createdAt: NOW,
      updatedAt: NOW,
    })
    if (body.fontIds?.length) {
      await db.insert(templateFonts).values(body.fontIds.map((fid: string) => ({ templateId: id, fontId: fid })))
    }
    const [t] = await db.select().from(templates).where(eq(templates.id, id))
    return c.json(t, 201)
  })

  // GET /:id
  app.get('/:id', async (c) => {
    const [t] = await db.select().from(templates).where(eq(templates.id, c.req.param('id'))).limit(1)
    if (!t)
      return c.json({ error: 'Template not found' }, 404)
    return c.json(t)
  })

  // PUT /:id
  app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const [existing] = await db.select().from(templates).where(eq(templates.id, id)).limit(1)
    if (!existing)
      return c.json({ error: 'Template not found' }, 404)
    const body = await c.req.json()
    await db.update(templates).set({
      ...(body.name && { name: body.name }),
      ...(body.code !== undefined && { code: body.code }),
      updatedAt: NOW,
    }).where(eq(templates.id, id))
    const [updated] = await db.select().from(templates).where(eq(templates.id, id))
    return c.json(updated)
  })

  // DELETE /:id
  app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const [existing] = await db.select().from(templates).where(eq(templates.id, id)).limit(1)
    if (!existing)
      return c.json({ error: 'Template not found' }, 404)
    await db.delete(templates).where(eq(templates.id, id))
    return c.json({ ok: true })
  })

  return app
}

describe('gET /templates', () => {
  let app: Hono

  beforeEach(() => {
    app = createTemplatesTestApp(createTestDb())
  })

  it('returns empty array when no templates', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

describe('pOST /templates', () => {
  let app: Hono

  beforeEach(() => {
    app = createTemplatesTestApp(createTestDb())
  })

  it('creates a template and returns 201', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Template', code: '<div>Hello</div>', variableSchema: [] }),
    })
    expect(res.status).toBe(201)
    const t = await res.json() as { id: string, name: string }
    expect(t.name).toBe('My Template')
    expect(t.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('returns 400 when name is empty', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', code: '' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('gET /templates/:id', () => {
  let app: Hono

  beforeEach(() => {
    app = createTemplatesTestApp(createTestDb())
  })

  it('returns 404 for unknown id', async () => {
    const res = await app.request('/no-such-id')
    expect(res.status).toBe(404)
  })

  it('returns the template for a known id', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'T1', code: '' }),
    })
    const { id } = await createRes.json() as { id: string }

    const getRes = await app.request(`/${id}`)
    expect(getRes.status).toBe(200)
    const t = await getRes.json() as { id: string }
    expect(t.id).toBe(id)
  })
})

describe('pUT /templates/:id', () => {
  let app: Hono

  beforeEach(() => {
    app = createTemplatesTestApp(createTestDb())
  })

  it('updates the template name', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Old Name', code: '' }),
    })
    const { id } = await createRes.json() as { id: string }

    const putRes = await app.request(`/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })
    expect(putRes.status).toBe(200)
    const t = await putRes.json() as { name: string }
    expect(t.name).toBe('New Name')
  })

  it('returns 404 for unknown template', async () => {
    const res = await app.request('/unknown', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('dELETE /templates/:id', () => {
  let app: Hono

  beforeEach(() => {
    app = createTemplatesTestApp(createTestDb())
  })

  it('deletes an existing template', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ToDelete', code: '' }),
    })
    const { id } = await createRes.json() as { id: string }

    const del = await app.request(`/${id}`, { method: 'DELETE' })
    expect(del.status).toBe(200)

    const get = await app.request(`/${id}`)
    expect(get.status).toBe(404)
  })

  it('returns 404 for non-existent template', async () => {
    const res = await app.request('/ghost', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
