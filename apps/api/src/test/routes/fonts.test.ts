import { randomBytes, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fonts as fontsTable, sessions, templateFonts } from '../../db/schema'
import { deleteFontFile, downloadFontFile, fetchGoogleFontVariants, FontError, saveFontFile, validateFontExtension } from '../../services/fonts'

import { createTestDb } from '../helpers/db'

// Stub env so saveFontFile writes to /tmp
vi.mock('../../env', () => ({
  env: {
    FONT_DIR: '/tmp/og-test-fonts',
    NODE_ENV: 'test',
  },
}))

// Stub font service helpers that perform real disk / network I/O
vi.mock('../../services/fonts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/fonts')>()
  return {
    ...original,
    saveFontFile: vi.fn((_id: string, ext: string, _data: Buffer) => `/tmp/og-test-fonts/stub${ext}`),
    deleteFontFile: vi.fn(),
    fetchGoogleFontVariants: vi.fn(),
    downloadFontFile: vi.fn().mockResolvedValue(Buffer.from('fake-font')),
  }
})

function createFontsTestApp(db: ReturnType<typeof createTestDb>) {
  const sessionId = randomBytes(16).toString('hex')
  db.insert(sessions).values({ id: sessionId, expiresAt: new Date(Date.now() + 86400000) }).run()

  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set(
    // @ts-expect-error session middleware expects a real session store, but this is good enough for testing routes that require a session
      'sessionId',
      sessionId,
    )
    await next()
  })

  // GET /fonts
  app.get('/', async (c) => {
    const rows = await db.select({
      id: fontsTable.id,
      family: fontsTable.family,
      weight: fontsTable.weight,
      style: fontsTable.style,
      source: fontsTable.source,
      createdAt: fontsTable.createdAt,
    }).from(fontsTable).orderBy(fontsTable.family, fontsTable.weight)
    return c.json(rows)
  })

  // POST /fonts/upload
  app.post('/upload', async (c) => {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file || typeof file === 'string')
      return c.json({ error: 'file field is required' }, 400)

    let ext: ReturnType<typeof validateFontExtension>
    try {
      ext = validateFontExtension(file.name)
    }
    catch (err) {
      if (err instanceof FontError)
        return c.json({ error: err.message }, err.statusCode)
      throw err
    }

    const family = (formData.get('family') as string | null)?.trim()
    if (!family)
      return c.json({ error: 'family is required' }, 400)
    const weight = Number.parseInt((formData.get('weight') as string) ?? '400', 10)
    const style = ((formData.get('style') as string) ?? 'normal') as 'normal' | 'italic'

    const id = randomUUID()
    const buf = Buffer.from(await file.arrayBuffer())
    const filePath = saveFontFile(id, ext, buf)

    const now = new Date().toISOString()
    await db.insert(fontsTable).values({ id, family, weight, style, source: 'upload', filePath, createdAt: now })
    return c.json({ id, family, weight, style, source: 'upload' as const, createdAt: now }, 201)
  })

  // POST /fonts/hosted
  app.post('/hosted', async (c) => {
    const body = await c.req.json()
    if (!body.family?.trim())
      return c.json({ error: 'family is required' }, 400)
    if (!body.variants?.length)
      return c.json({ error: 'variants array is required' }, 400)

    let variants: Awaited<ReturnType<typeof fetchGoogleFontVariants>>
    try {
      variants = await fetchGoogleFontVariants(body.family.trim(), body.variants)
    }
    catch (err) {
      if (err instanceof FontError)
        return c.json({ error: err.message }, err.statusCode)
      throw err
    }

    const now = new Date().toISOString()
    const created = []
    for (const variant of variants) {
      const id = randomUUID()
      const buf = await downloadFontFile(variant.url)
      const filePath = saveFontFile(id, variant.ext, buf)
      await db.insert(fontsTable).values({ id, family: variant.family, weight: variant.weight, style: variant.style, source: 'google', filePath, createdAt: now })
      created.push({ id, family: variant.family, weight: variant.weight, style: variant.style, source: 'google' as const, createdAt: now })
    }
    return c.json(created, 201)
  })

  // DELETE /fonts/:id
  app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const [font] = await db.select().from(fontsTable).where(eq(fontsTable.id, id)).limit(1)
    if (!font)
      return c.json({ error: 'Font not found' }, 404)
    await db.delete(templateFonts).where(eq(templateFonts.fontId, id))
    await db.delete(fontsTable).where(eq(fontsTable.id, id))
    deleteFontFile(font.filePath)
    return c.json({ ok: true })
  })

  return app
}

// Helper: build a minimal multipart FormData for font upload
function buildFontFormData(filename: string, family: string, weight = 400, style = 'normal') {
  const fd = new FormData()
  fd.append('file', new File([new Uint8Array(4)], filename, { type: 'font/ttf' }))
  fd.append('family', family)
  fd.append('weight', String(weight))
  fd.append('style', style)
  return fd
}

describe('gET /fonts', () => {
  let db: ReturnType<typeof createTestDb>
  let app: Hono

  beforeEach(() => {
    db = createTestDb()
    app = createFontsTestApp(db)
    vi.clearAllMocks()
  })

  it('returns empty array when no fonts', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns list of fonts without filePath', async () => {
    const now = new Date().toISOString()
    await db.insert(fontsTable).values({
      id: 'f1',
      family: 'Inter',
      weight: 400,
      style: 'normal',
      source: 'upload',
      filePath: '/tmp/f1.ttf',
      createdAt: now,
    })
    const res = await app.request('/')
    const fonts = await res.json() as Array<Record<string, unknown>>
    expect(fonts).toHaveLength(1)
    expect(fonts[0].family).toBe('Inter')
    expect(fonts[0]).not.toHaveProperty('filePath')
  })
})

describe('pOST /fonts/upload', () => {
  let db: ReturnType<typeof createTestDb>
  let app: Hono

  beforeEach(() => {
    db = createTestDb()
    app = createFontsTestApp(db)
    vi.clearAllMocks()
    vi.mocked(saveFontFile).mockReturnValue('/tmp/og-test-fonts/stub.ttf')
  })

  it('uploads a TTF font and returns 201', async () => {
    const fd = buildFontFormData('Inter.ttf', 'Inter', 400, 'normal')
    const res = await app.request('/upload', { method: 'POST', body: fd })
    expect(res.status).toBe(201)
    const json = await res.json() as Record<string, unknown>
    expect(json.family).toBe('Inter')
    expect(json.source).toBe('upload')
    expect(json).not.toHaveProperty('filePath')
  })

  it('returns 400 for missing file field', async () => {
    const fd = new FormData()
    fd.append('family', 'Inter')
    const res = await app.request('/upload', { method: 'POST', body: fd })
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing family field', async () => {
    const fd = new FormData()
    fd.append('file', new File([new Uint8Array(4)], 'font.ttf'))
    const res = await app.request('/upload', { method: 'POST', body: fd })
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string }
    expect(json.error).toMatch(/family/)
  })

  it('rejects WOFF2 files with a helpful error', async () => {
    const fd = buildFontFormData('font.woff2', 'Inter')
    const res = await app.request('/upload', { method: 'POST', body: fd })
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string }
    expect(json.error).toMatch(/WOFF2/)
  })

  it('rejects unsupported extensions', async () => {
    const fd = buildFontFormData('font.eot', 'Inter')
    const res = await app.request('/upload', { method: 'POST', body: fd })
    expect(res.status).toBe(400)
  })
})

describe('pOST /fonts/hosted', () => {
  let db: ReturnType<typeof createTestDb>
  let app: Hono

  beforeEach(() => {
    db = createTestDb()
    app = createFontsTestApp(db)
    vi.clearAllMocks()
    vi.mocked(saveFontFile).mockReturnValue('/tmp/og-test-fonts/stub.ttf')
  })

  it('fetches and stores Google Font variants', async () => {
    vi.mocked(fetchGoogleFontVariants).mockResolvedValue([
      { family: 'Inter', weight: 400, style: 'normal', url: 'https://fonts.gstatic.com/inter.ttf', ext: '.ttf' },
      { family: 'Inter', weight: 700, style: 'normal', url: 'https://fonts.gstatic.com/inter-bold.ttf', ext: '.ttf' },
    ])

    const res = await app.request('/hosted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family: 'Inter', variants: ['400', '700'] }),
    })
    expect(res.status).toBe(201)
    const created = await res.json() as Array<Record<string, unknown>>
    expect(created).toHaveLength(2)
    expect(created[0].source).toBe('google')
    expect(created.every(f => !('filePath' in f))).toBe(true)
  })

  it('returns 400 when family is missing', async () => {
    const res = await app.request('/hosted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants: ['400'] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when variants array is empty', async () => {
    const res = await app.request('/hosted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family: 'Inter', variants: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when fetchGoogleFontVariants throws FontError', async () => {
    vi.mocked(fetchGoogleFontVariants).mockRejectedValue(
      new FontError('No compatible font files found', 400),
    )
    const res = await app.request('/hosted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family: 'UnknownFont', variants: ['400'] }),
    })
    expect(res.status).toBe(400)
  })
})

describe('dELETE /fonts/:id', () => {
  let db: ReturnType<typeof createTestDb>
  let app: Hono

  beforeEach(() => {
    db = createTestDb()
    app = createFontsTestApp(db)
    vi.clearAllMocks()
  })

  it('deletes a font and calls deleteFontFile', async () => {
    const now = new Date().toISOString()
    await db.insert(fontsTable).values({
      id: 'f1',
      family: 'Inter',
      weight: 400,
      style: 'normal',
      source: 'upload',
      filePath: '/tmp/f1.ttf',
      createdAt: now,
    })
    const res = await app.request('/f1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(deleteFontFile).toHaveBeenCalledWith('/tmp/f1.ttf')

    // Font should be gone from DB
    const rows = await db.select().from(fontsTable).where(eq(fontsTable.id, 'f1'))
    expect(rows).toHaveLength(0)
  })

  it('returns 404 for non-existent font', async () => {
    const res = await app.request('/no-such-id', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
