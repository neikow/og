import type { OGVariable } from '@og/shared'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { fonts, templateFonts, templates } from '../db/schema'
import { apiKeyMiddleware } from '../middleware/api-key'
import {
  buildCacheKey,
  cacheGet,
  cacheSetWithIndex,
} from '../services/cache'
import { buildGallery } from '../services/gallery'
import { loadFontData, renderToPng } from '../services/render'
import { buildClassStyleMap, extractClassNames } from '../services/tailwind'
import { TranspileError, transpileTemplate } from '../services/transpile'
import { validateAndCoerceVariables, VariableValidationError } from '../services/variables'

export const ogRouter = new Hono()

ogRouter.use('*', apiKeyMiddleware)

// GET /og/:uuid
ogRouter.get('/:uuid', async (c) => {
  const uuid = c.req.param('uuid')

  // 1. Load template
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, uuid))
    .limit(1)

  if (!template) {
    return c.json({ error: 'Template not found' }, 404)
  }

  // 1b. Enforce tag restrictions on the API key
  const tagRestrictions = c.get('apiKeyTagRestrictions' as never) as string[] | undefined
  if (tagRestrictions && tagRestrictions.length > 0) {
    const templateTags = (template.tags ?? []) as string[]
    const hasOverlap = templateTags.some(t => tagRestrictions.includes(t))
    if (!hasOverlap) {
      return c.json({ error: 'Forbidden', details: 'This API key is not allowed to render this template' }, 403)
    }
  }

  // 2. Parse & validate query params against variable schema
  const rawParams = c.req.query()
  const schema = template.variableSchema as OGVariable[]

  let variables: Record<string, unknown>
  try {
    variables = validateAndCoerceVariables(schema, rawParams)
  }
  catch (err) {
    if (err instanceof VariableValidationError) {
      return c.json({ error: err.message }, 400)
    }
    throw err
  }

  // 3. Check cache
  const stringParams: Record<string, string> = {}
  for (const [k, v] of Object.entries(rawParams)) {
    stringParams[k] = String(v)
  }
  const cacheKey = buildCacheKey(uuid, stringParams)
  const cached = cacheGet(cacheKey)

  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'image/png',
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'ETag': `"${cacheKey}"`,
      },
    })
  }

  // 4. Load assigned fonts
  const fontRows = await db
    .select({ font: fonts })
    .from(templateFonts)
    .innerJoin(fonts, eq(templateFonts.fontId, fonts.id))
    .where(eq(templateFonts.templateId, uuid))

  const fontDatas = loadFontData(fontRows.map(r => r.font) as Parameters<typeof loadFontData>[0])

  // 5. Transpile + render
  let png: Buffer
  try {
    const classNames = extractClassNames(template.code)
    const classStyleMap = await buildClassStyleMap(template.cssConfig ?? '', classNames)
    const gallery = await buildGallery()
    const element = transpileTemplate(template.code, { ...variables, Gallery: gallery }, classStyleMap)
    png = await renderToPng(element, fontDatas)
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const details = err instanceof TranspileError && err.cause instanceof Error
      ? err.cause.message
      : undefined
    return c.json({ error: message, details }, 400)
  }

  // 6. Store in cache with template index for per-template invalidation
  cacheSetWithIndex(uuid, cacheKey, png)

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      'ETag': `"${cacheKey}"`,
    },
  })
})
