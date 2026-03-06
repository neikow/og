import { db } from '../db/client.js'
import { assets } from '../db/schema.js'
import { env } from '../env.js'

/**
 * Build the `Gallery` object that is injected into every template render.
 *
 * Keys are asset identifiers (e.g. "hero_image"), values are absolute URLs
 * that `preloadImages` will resolve to inline data URIs before Satori renders.
 *
 * Example result:
 * ```
 * {
 *   hero_image: "http://localhost:3000/assets/file/uuid-1",
 *   background: "http://localhost:3000/assets/file/uuid-2",
 * }
 * ```
 */
export async function buildGallery(): Promise<Record<string, string>> {
  const rows = await db.select({
    identifier: assets.identifier,
    id: assets.id,
  }).from(assets)

  const gallery: Record<string, string> = {}
  const base = `http://localhost:${env.PORT}`
  for (const row of rows) {
    gallery[row.identifier] = `${base}/assets/file/${row.id}`
  }
  return gallery
}
