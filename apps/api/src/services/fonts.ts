import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { env } from '../env'

export type SupportedFontExt = '.ttf' | '.otf' | '.woff'
const SUPPORTED_EXTENSIONS: SupportedFontExt[] = ['.ttf', '.otf', '.woff']

export class FontError extends Error {
  constructor(
    message: string,
    public readonly statusCode: ContentfulStatusCode = 400,
  ) {
    super(message)
    this.name = 'FontError'
  }
}

/**
 * Validate that a font file extension is supported by Satori.
 * WOFF2 is explicitly rejected.
 */
export function validateFontExtension(filename: string): SupportedFontExt {
  const ext = extname(filename).toLowerCase() as SupportedFontExt
  if (ext === '.woff2' as string) {
    throw new FontError('WOFF2 fonts are not supported. Please use TTF, OTF, or WOFF.', 400)
  }
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new FontError(
      `Unsupported font format "${ext}". Supported formats: TTF, OTF, WOFF.`,
      400,
    )
  }
  return ext
}

/**
 * Save a font buffer to disk and return the absolute file path.
 */
export function saveFontFile(fontId: string, ext: string, data: Buffer): string {
  mkdirSync(env.FONT_DIR, { recursive: true })
  const filePath = join(env.FONT_DIR, `${fontId}${ext}`)
  writeFileSync(filePath, data)
  return filePath
}

/**
 * Delete a font file from disk. Does not throw if file doesn't exist.
 */
export function deleteFontFile(filePath: string): void {
  try {
    unlinkSync(filePath)
  }
  catch {
    // File already gone — ignore
  }
}

// ─── Google Fonts ─────────────────────────────────────────────────────────────

interface GoogleFontVariant {
  family: string
  weight: number
  style: 'normal' | 'italic'
  url: string
  ext: SupportedFontExt
}

// Matches the src URL and format from Google Fonts CSS
// Format: src: url(https://...) format('truetype');
const FONT_URL_REGEX = /url\(([^)]+)\)\s+format\(['"]?(truetype|opentype|woff)['"]?\)/g
const ITALIC_STRIP_REGEX = /italic/
const QUOTE_STRIP_RE = /['"]/g

/**
 * Fetch font file URLs from Google Fonts for a given family + variants.
 *
 * Google Fonts returns WOFF2 for modern browsers, so we use a legacy
 * User-Agent to force TTF responses that Satori can consume.
 */
export async function fetchGoogleFontVariants(
  family: string,
  variants: string[],
): Promise<GoogleFontVariant[]> {
  // Parse variants like ['400', '700', '400italic', '700italic']
  const requests = variants.map((v) => {
    const italic = ITALIC_STRIP_REGEX.test(v)
    const weight = Number.parseInt(italic ? v.replace(ITALIC_STRIP_REGEX, '') : v, 10) || 400
    return { weight, style: italic ? 'italic' : ('normal' as 'normal' | 'italic') }
  })

  // De-duplicate
  const unique = [...new Map(requests.map(r => [`${r.weight}${r.style}`, r])).values()]

  const results: GoogleFontVariant[] = []

  for (const { weight, style } of unique) {
    const italic = style === 'italic' ? ':ital,wght@1,' : ':wght@'
    const apiUrl
      = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`
        + `${italic}${weight}`

    // Use an old Chrome UA to force TTF (not WOFF2) in the response
    const css = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.54.16 (KHTML, like Gecko) Version/5.1.4 Safari/534.54.16',
      },
    }).then((r) => {
      if (!r.ok)
        throw new FontError(`Google Fonts API error: ${r.status} for family "${family}"`)
      return r.text()
    })

    // Extract the first src URL from the CSS — take only the first match per variant
    // Format: src: url(https://fonts.gstatic.com/s/...) format('truetype');
    // Reset lastIndex since FONT_URL_REGEX is a module-level stateful regex
    FONT_URL_REGEX.lastIndex = 0
    const match = FONT_URL_REGEX.exec(css)
    if (match) {
      const url = match[1].replace(QUOTE_STRIP_RE, '')
      const fmt = match[2]
      const ext = fmt === 'woff' ? '.woff' : fmt === 'opentype' ? '.otf' : '.ttf'
      results.push({ family, weight, style, url, ext: ext as SupportedFontExt })
    }
  }

  if (results.length === 0) {
    throw new FontError(
      `No compatible font files found for "${family}" with variants: ${variants.join(', ')}. `
      + 'Try different variant names (e.g. "400", "700", "400italic").',
    )
  }

  return results
}

/**
 * Download font binary from a URL.
 */
export async function downloadFontFile(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new FontError(`Failed to download font from ${url}: ${res.status}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
