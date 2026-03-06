import type { PreviewInput } from '@og/shared'
import { inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client.js'
import { fonts } from '../db/schema.js'
import { sessionMiddleware } from '../middleware/session.js'
import { buildGallery } from '../services/gallery.js'
import { loadFontData, renderToPng } from '../services/render.js'
import { buildClassStyleMap, extractClassNames } from '../services/tailwind.js'
import { elementToHtml, TranspileError, transpileTemplate } from '../services/transpile.js'
import { validateAndCoerceVariables, VariableValidationError } from '../services/variables.js'

export const previewRouter = new Hono()

previewRouter.use('*', sessionMiddleware)

/**
 * Resolve variables from the request body.
 * If `variableSchema` is provided, validate and coerce.
 * Otherwise fall back to raw strings (backward-compatible).
 */
function resolveVariables(body: PreviewInput): Record<string, unknown> | { error: string } {
  if (!body.variableSchema?.length) {
    return body.variables ?? {}
  }
  try {
    return validateAndCoerceVariables(body.variableSchema, body.variables ?? {})
  }
  catch (err) {
    if (err instanceof VariableValidationError) {
      return { error: err.message }
    }
    throw err
  }
}

// POST /preview
previewRouter.post('/', async (c) => {
  const body = await c.req.json<PreviewInput>()

  if (!body.code?.trim()) {
    return c.json({ error: 'code is required' }, 400)
  }

  // Load selected fonts
  let fontDatas: ReturnType<typeof loadFontData> = []

  if (body.fontIds?.length) {
    const selectedFonts = await db
      .select()
      .from(fonts)
      .where(inArray(fonts.id, body.fontIds))

    fontDatas = loadFontData(selectedFonts as Parameters<typeof loadFontData>[0])
  }

  try {
    // Validate + coerce variables if schema is provided
    const resolvedVars = resolveVariables(body)
    if ('error' in resolvedVars) {
      return c.json(resolvedVars, 400)
    }

    // Build Tailwind class→style map from the code + user CSS config
    const classNames = extractClassNames(body.code)
    const classStyleMap = await buildClassStyleMap(body.cssConfig ?? '', classNames)

    // Inject Gallery into variables
    const gallery = await buildGallery()

    // Transpile + render (no caching for preview)
    const element = transpileTemplate(body.code, { ...resolvedVars, Gallery: gallery }, classStyleMap)
    const png = await renderToPng(element, fontDatas)

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
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

// POST /preview/debug
// Returns a full HTML document with the React element tree serialised as real
// DOM nodes with inline styles — load it in an <iframe> and inspect with DevTools.
previewRouter.post('/debug', async (c) => {
  const body = await c.req.json<PreviewInput>()

  if (!body.code?.trim()) {
    return c.json({ error: 'code is required' }, 400)
  }

  // Load selected fonts (same as PNG route)
  let fontDatas: ReturnType<typeof loadFontData> = []

  if (body.fontIds?.length) {
    const selectedFonts = await db
      .select()
      .from(fonts)
      .where(inArray(fonts.id, body.fontIds))

    fontDatas = loadFontData(selectedFonts as Parameters<typeof loadFontData>[0])
  }

  try {
    const resolvedVars = resolveVariables(body)
    if ('error' in resolvedVars) {
      return c.json(resolvedVars, 400)
    }

    const classNames = extractClassNames(body.code)
    const classStyleMap = await buildClassStyleMap(body.cssConfig ?? '', classNames)

    // Inject Gallery into variables
    const gallery = await buildGallery()

    const element = transpileTemplate(body.code, { ...resolvedVars, Gallery: gallery }, classStyleMap)

    const inner = elementToHtml(element)

    // Build @font-face CSS from loaded font data so the browser renders with
    // the correct fonts instead of falling back to system fonts.
    const fontFaceCSS = fontDatas.map(({ font, data }) => {
      const filePath = (font as unknown as { filePath?: string }).filePath ?? ''
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'woff2'
      const mime = ext === 'ttf' ? 'font/ttf' : ext === 'otf' ? 'font/otf' : ext === 'woff' ? 'font/woff' : 'font/woff2'
      const fmt = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext
      const b64 = data.toString('base64')
      return `@font-face {
  font-family: '${font.family}';
  font-weight: ${font.weight};
  font-style: ${font.style};
  src: url('data:${mime};base64,${b64}') format('${fmt}');
}`
    }).join('\n')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OG Debug</title>
  <style>
    ${fontFaceCSS}
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #1a1a1a; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: repeating-linear-gradient(
        45deg,
        #9e8610,
        #9e8610 10px,
        #000000 10px,
        #000000 20px
      );
    }
    .og-root {
      width: 1200px;
      height: 630px;
      position: relative;
      overflow: hidden;
      transform-origin: top left;
    }
  </style>
  <script>
    // Scale the OG root to fit the viewport while preserving aspect ratio
    function scale() {
      const el = document.querySelector('.og-root')
      if (!el) return
      const s = Math.min(
        (window.innerWidth - 32) / 1200,
        (window.innerHeight - 32) / 630
      )
      el.style.transform = 'scale(' + s + ')'
      el.style.marginBottom = (630 * s - 630) + 'px'
      el.style.marginRight  = (1200 * s - 1200) + 'px'
    }
    window.addEventListener('load', scale)
    window.addEventListener('resize', scale)
  </script>
</head>
<body>
  <div class="og-root">${inner}</div>
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
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
