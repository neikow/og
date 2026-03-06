import type { AddHostedFontInput } from '@og/shared'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client.js'
import { fonts, templateFonts } from '../db/schema.js'
import { sessionMiddleware } from '../middleware/session.js'
import {
  deleteFontFile,
  downloadFontFile,
  fetchGoogleFontVariants,
  FontError,
  saveFontFile,
  validateFontExtension,
} from '../services/fonts.js'

export const fontsRouter = new Hono()

fontsRouter.use('*', sessionMiddleware)

// GET /fonts
fontsRouter.get('/', async (c) => {
  const rows = await db.select({
    id: fonts.id,
    family: fonts.family,
    weight: fonts.weight,
    style: fonts.style,
    source: fonts.source,
    createdAt: fonts.createdAt,
  }).from(fonts).orderBy(fonts.family, fonts.weight)

  return c.json(rows)
})

// POST /fonts/upload — multipart upload
fontsRouter.post('/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file || typeof file === 'string') {
    return c.json({ error: 'file field is required' }, 400)
  }

  let ext: ReturnType<typeof validateFontExtension>
  try {
    ext = validateFontExtension(file.name)
  }
  catch (err) {
    if (err instanceof FontError)
      return c.json({ error: err.message }, err.statusCode ?? 400)
    throw err
  }

  // Parse family, weight, style from form data (with fallbacks)
  const family = (formData.get('family') as string | null)?.trim()
  if (!family)
    return c.json({ error: 'family is required' }, 400)

  const weight = Number.parseInt((formData.get('weight') as string) ?? '400', 10)
  const style = ((formData.get('style') as string) ?? 'normal') as 'normal' | 'italic'

  const id = randomUUID()
  const buf = Buffer.from(await file.arrayBuffer())
  const filePath = saveFontFile(id, ext, buf)

  const now = new Date().toISOString()
  await db.insert(fonts).values({
    id,
    family,
    weight,
    style,
    source: 'upload',
    filePath,
    createdAt: now,
  })

  return c.json(
    { id, family, weight, style, source: 'upload' as const, createdAt: now },
    201,
  )
})

// POST /fonts/hosted — fetch from Google Fonts
fontsRouter.post('/hosted', async (c) => {
  const body = await c.req.json<AddHostedFontInput>()

  if (!body.family?.trim()) {
    return c.json({ error: 'family is required' }, 400)
  }
  if (!body.variants?.length) {
    return c.json({ error: 'variants array is required' }, 400)
  }

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

    await db.insert(fonts).values({
      id,
      family: variant.family,
      weight: variant.weight,
      style: variant.style,
      source: 'google',
      filePath,
      createdAt: now,
    })

    created.push({
      id,
      family: variant.family,
      weight: variant.weight,
      style: variant.style,
      source: 'google' as const,
      createdAt: now,
    })
  }

  return c.json(created, 201)
})

// DELETE /fonts/:id
fontsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const [font] = await db
    .select()
    .from(fonts)
    .where(eq(fonts.id, id))
    .limit(1)

  if (!font)
    return c.json({ error: 'Font not found' }, 404)

  // Remove font assignments (cascade would handle it too, but be explicit)
  await db.delete(templateFonts).where(eq(templateFonts.fontId, id))
  await db.delete(fonts).where(eq(fonts.id, id))

  // Delete file from disk
  deleteFontFile(font.filePath)

  return c.json({ ok: true })
})
