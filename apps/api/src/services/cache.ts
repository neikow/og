import { createHash } from 'node:crypto'
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, Buffer>({
  max: 500,
  maxSize: 50 * 1024 * 1024, // 50 MB
  sizeCalculation: buf => buf.byteLength,
  ttl: 1000 * 60 * 60 * 24, // 24 hours
})

/**
 * Build a deterministic cache key from a template UUID and its resolved query params.
 */
export function buildCacheKey(
  templateId: string,
  params: Record<string, string>,
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
  return createHash('sha256')
    .update(JSON.stringify({ templateId, params: sortedParams }))
    .digest('hex')
}

export function cacheGet(key: string): Buffer | undefined {
  return cache.get(key)
}

export function cacheSet(key: string, value: Buffer): void {
  cache.set(key, value)
}

/**
 * Invalidate all cached entries for a specific template.
 * We store a secondary index (templateId → Set of keys) for O(n) per-template invalidation.
 */
const templateKeyIndex = new Map<string, Set<string>>()

export function cacheSetWithIndex(
  templateId: string,
  key: string,
  value: Buffer,
): void {
  cache.set(key, value)
  if (!templateKeyIndex.has(templateId)) {
    templateKeyIndex.set(templateId, new Set())
  }
  templateKeyIndex.get(templateId)!.add(key)
}

export function invalidateTemplate(templateId: string): void {
  const keys = templateKeyIndex.get(templateId)
  if (keys) {
    for (const key of keys) {
      cache.delete(key)
    }
    templateKeyIndex.delete(templateId)
  }
}

export function getCacheStats() {
  return {
    size: cache.size,
    calculatedSize: cache.calculatedSize,
    max: cache.max,
    maxSize: (cache as unknown as { maxSize: number }).maxSize,
  }
}

// Exported for testing
export { cache as _cache, templateKeyIndex as _templateKeyIndex }
