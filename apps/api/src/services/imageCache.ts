import { LRUCache } from 'lru-cache'

export interface ImageEntry {
  data: Buffer
  mimeType: string
}

/**
 * In-memory LRU cache for remote images.
 * Keyed by URL, storing raw bytes + detected MIME type.
 * Separate from the PNG render cache in cache.ts.
 */
const imageCache = new LRUCache<string, ImageEntry>({
  max: 1000,
  maxSize: 100 * 1024 * 1024, // 100 MB
  sizeCalculation: entry => entry.data.byteLength,
  ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
})

/**
 * Derive a MIME type from a Content-Type header value,
 * falling back to a best-guess from the URL path.
 */
function detectMimeType(contentType: string | null, url: string): string {
  if (contentType) {
    // Strip parameters like "; charset=utf-8"
    const base = contentType.split(';')[0].trim().toLowerCase()
    if (base.startsWith('image/'))
      return base
  }

  // Fallback: guess from URL extension
  const pathname = (() => {
    try {
      return new URL(url).pathname
    }
    catch {
      return url
    }
  })()
  const ext = pathname.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    case 'avif': return 'image/avif'
    default: return 'image/png'
  }
}

/**
 * In-flight request map: URLs currently being fetched.
 * Deduplicates concurrent requests for the same URL so we never issue two
 * simultaneous fetches (important when `preloadImages` walks the tree in parallel).
 */
const inFlight = new Map<string, Promise<ImageEntry>>()

/**
 * Fetch a remote image URL, cache the result, and return the cached entry.
 * Subsequent calls with the same URL (even concurrent ones) share a single
 * in-flight request and then return the cached entry.
 *
 * Throws if the fetch fails or the response is not OK.
 */
export function fetchAndCacheImage(url: string): Promise<ImageEntry> {
  const cached = imageCache.get(url)
  if (cached)
    return Promise.resolve(cached)

  const existing = inFlight.get(url)
  if (existing)
    return existing

  const promise = (async () => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image ${url}: HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      const mimeType = detectMimeType(contentType, url)
      const arrayBuffer = await response.arrayBuffer()
      // Slice to get an isolated buffer (Node.js may pool the backing ArrayBuffer)
      const buf = Buffer.from(arrayBuffer)
      const data = Buffer.allocUnsafe(buf.byteLength)
      buf.copy(data)

      const entry: ImageEntry = { data, mimeType }
      imageCache.set(url, entry)
      return entry
    }
    finally {
      inFlight.delete(url)
    }
  })()

  inFlight.set(url, promise)

  return promise
}

/**
 * Resolve a URL to a `data:<mime>;base64,...` URI using the image cache.
 *
 * - Already-data URIs are returned as-is.
 * - Non-http(s) URLs (relative paths, blob:, etc.) are returned as-is.
 * - Remote http(s) URLs are fetched, cached, and returned as data URIs.
 */
export async function resolveImageUrl(url: string): Promise<string> {
  if (!url)
    return url
  if (url.startsWith('data:'))
    return url
  if (!url.startsWith('http://') && !url.startsWith('https://'))
    return url

  const entry = await fetchAndCacheImage(url)
  return `data:${entry.mimeType};base64,${entry.data.toString('base64')}`
}

// Exported for testing
export { imageCache as _imageCache }
