import type { CreateTemplateInput, OGVariable, UpdateTemplateInput } from '@og/shared'
import { randomUUID } from 'node:crypto'
import { eq, like } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { fonts, templateFonts, templates } from '../db/schema'
import { sessionMiddleware } from '../middleware/session'
import {
  buildCacheKey,
  cacheGet,
  cacheSetWithIndex,
  invalidateTemplate,
} from '../services/cache'
import { buildGallery } from '../services/gallery'
import { loadFontData, renderToPng } from '../services/render'
import { buildClassStyleMap, extractClassNames } from '../services/tailwind'
import { TranspileError, transpileTemplate } from '../services/transpile'

export const templatesRouter = new Hono()

templatesRouter.use('*', sessionMiddleware)

// GET /templates
templatesRouter.get('/', async (c) => {
  const tag = c.req.query('tag')
  let rows
  if (tag) {
    // SQLite JSON array — match if tag appears as a JSON string value in the array
    rows = await db
      .select()
      .from(templates)
      .where(like(templates.tags, `%"${tag}"%`))
      .orderBy(templates.updatedAt)
  }
  else {
    rows = await db.select().from(templates).orderBy(templates.updatedAt)
  }
  return c.json(rows)
})

// POST /templates
templatesRouter.post('/', async (c) => {
  const body = await c.req.json<CreateTemplateInput>()

  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 400)
  }

  const now = new Date().toISOString()
  const id = randomUUID()

  await db.insert(templates).values({
    id,
    name: body.name.trim(),
    code: body.code || getDefaultTemplateCode(),
    cssConfig: body.cssConfig || getDefaultCssConfig(),
    variableSchema: body.variableSchema ?? [],
    tags: body.tags ?? [],
    createdAt: now,
    updatedAt: now,
  })

  // Assign fonts
  if (body.fontIds?.length) {
    await db.insert(templateFonts).values(
      body.fontIds.map(fontId => ({ templateId: id, fontId })),
    )
  }

  const template = await getTemplateWithFonts(id)
  return c.json(template, 201)
})

// GET /templates/:id
templatesRouter.get('/:id', async (c) => {
  const template = await getTemplateWithFonts(c.req.param('id'))
  if (!template)
    return c.json({ error: 'Template not found' }, 404)
  return c.json(template)
})

// PUT /templates/:id
templatesRouter.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<UpdateTemplateInput>()

  const [existing] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, id))
    .limit(1)

  if (!existing)
    return c.json({ error: 'Template not found' }, 404)

  const now = new Date().toISOString()

  await db
    .update(templates)
    .set({
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.code !== undefined && { code: body.code }),
      ...(body.cssConfig !== undefined && { cssConfig: body.cssConfig }),
      ...(body.variableSchema !== undefined && { variableSchema: body.variableSchema }),
      ...(body.tags !== undefined && { tags: body.tags }),
      updatedAt: now,
    })
    .where(eq(templates.id, id))

  // Update font assignments if provided
  if (body.fontIds !== undefined) {
    await db.delete(templateFonts).where(eq(templateFonts.templateId, id))
    if (body.fontIds.length > 0) {
      await db.insert(templateFonts).values(
        body.fontIds.map(fontId => ({ templateId: id, fontId })),
      )
    }
  }

  // Invalidate cache for this template
  invalidateTemplate(id)

  const updated = await getTemplateWithFonts(id)
  return c.json(updated)
})

// DELETE /templates/:id
templatesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const [existing] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, id))
    .limit(1)

  if (!existing)
    return c.json({ error: 'Template not found' }, 404)

  // Cascade deletes template_fonts too (via FK constraint)
  await db.delete(templates).where(eq(templates.id, id))
  invalidateTemplate(id)

  return c.json({ ok: true })
})

// GET /templates/:id/preview — render a small thumbnail using the template's default variables
// Cached separately from the OG cache (key prefix "preview:").
templatesRouter.get('/:id/preview', async (c) => {
  const id = c.req.param('id')

  const template = await getTemplateWithFonts(id)
  if (!template)
    return c.json({ error: 'Template not found' }, 404)

  // Build default variables from schema
  const schema = template.variableSchema as OGVariable[]
  const defaultVars: Record<string, unknown> = {}
  for (const v of schema) {
    if (v.default !== undefined) {
      defaultVars[v.name] = v.type === 'number'
        ? Number(v.default)
        : v.type === 'boolean'
          ? v.default === 'true'
          : v.default
    }
    else if (!v.required) {
      // leave absent
    }
    else {
      // required with no default — fill with a sensible placeholder
      defaultVars[v.name] = v.type === 'number' ? 0 : v.type === 'boolean' ? false : ''
    }
  }

  // Cache at half resolution: 600×315
  const previewCacheKey = `preview:${buildCacheKey(id, { _preview: '1' })}`
  const cached = cacheGet(previewCacheKey)
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
        'X-Cache': 'HIT',
      },
    })
  }

  const fontDatas = loadFontData(template.fonts as Parameters<typeof loadFontData>[0])

  try {
    const classNames = extractClassNames(template.code)
    const classStyleMap = await buildClassStyleMap(template.cssConfig ?? '', classNames)
    const element = transpileTemplate(template.code, {
      ...defaultVars,
      Gallery: await buildGallery(),
    }, classStyleMap)
    // Render at full 1200×630 so layout is correct, then downscale to 300×158
    const png = await renderToPng(element, fontDatas, { width: 1200, height: 630, fitToWidth: 300 })

    cacheSetWithIndex(id, previewCacheKey, png)

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
        'X-Cache': 'MISS',
      },
    })
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const details = err instanceof TranspileError && err.cause instanceof Error
      ? err.cause.message
      : undefined
    return c.json({ error: message, details }, 400)
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getTemplateWithFonts(id: string) {
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, id))
    .limit(1)

  if (!template)
    return null

  const fontRows = await db
    .select({ font: fonts })
    .from(templateFonts)
    .innerJoin(fonts, eq(templateFonts.fontId, fonts.id))
    .where(eq(templateFonts.templateId, id))

  return {
    ...template,
    fonts: fontRows.map(r => r.font),
  }
}

function getDefaultTemplateCode(): string {
  return `export interface Props {
}

export default function Template(props: Props) {
  return (
    <div class="bg-white h-full w-full flex items-center justify-center">
      <span class="text-xl font-bold">Hello Open Graph</span>
    </div>
  )
}
`
}

function getDefaultCssConfig(): string {
  return `@import "tailwindcss";

/* Add @theme overrides here, e.g.:
@theme {
  --color-brand: #6366f1;
  --font-sans: "Inter", sans-serif;
}
*/
`
}
