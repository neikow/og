import { beforeEach, describe, expect, it } from 'vitest'
import {
  _cache,
  _templateKeyIndex,
  buildCacheKey,
  cacheGet,
  cacheSet,
  cacheSetWithIndex,
  invalidateTemplate,
} from '../../services/cache'

describe('cache service', () => {
  beforeEach(() => {
    _cache.clear()
    _templateKeyIndex.clear()
  })

  describe('buildCacheKey', () => {
    it('produces a deterministic hex string', () => {
      const key = buildCacheKey('uuid-1', { title: 'Hello' })
      expect(key).toMatch(/^[a-f0-9]{64}$/)
    })

    it('produces the same key for same inputs', () => {
      const a = buildCacheKey('uuid-1', { title: 'Hello', subtitle: 'World' })
      const b = buildCacheKey('uuid-1', { subtitle: 'World', title: 'Hello' })
      expect(a).toBe(b)
    })

    it('produces different keys for different templates', () => {
      const a = buildCacheKey('uuid-1', { title: 'Hello' })
      const b = buildCacheKey('uuid-2', { title: 'Hello' })
      expect(a).not.toBe(b)
    })

    it('produces different keys for different params', () => {
      const a = buildCacheKey('uuid-1', { title: 'Hello' })
      const b = buildCacheKey('uuid-1', { title: 'World' })
      expect(a).not.toBe(b)
    })
  })

  describe('cacheGet / cacheSet', () => {
    it('returns undefined on cache miss', () => {
      expect(cacheGet('nonexistent')).toBeUndefined()
    })

    it('returns the stored buffer on cache hit', () => {
      const buf = Buffer.from('png-data')
      cacheSet('key-1', buf)
      expect(cacheGet('key-1')).toEqual(buf)
    })
  })

  describe('cacheSetWithIndex / invalidateTemplate', () => {
    it('stores and retrieves via index', () => {
      const buf = Buffer.from('data')
      const key = buildCacheKey('template-abc', { title: 'Test' })
      cacheSetWithIndex('template-abc', key, buf)
      expect(cacheGet(key)).toEqual(buf)
    })

    it('invalidates all keys for a given template', () => {
      const buf1 = Buffer.from('a')
      const buf2 = Buffer.from('b')
      const key1 = buildCacheKey('tmpl-1', { title: 'A' })
      const key2 = buildCacheKey('tmpl-1', { title: 'B' })
      const key3 = buildCacheKey('tmpl-2', { title: 'C' })

      cacheSetWithIndex('tmpl-1', key1, buf1)
      cacheSetWithIndex('tmpl-1', key2, buf2)
      cacheSetWithIndex('tmpl-2', key3, Buffer.from('c'))

      invalidateTemplate('tmpl-1')

      expect(cacheGet(key1)).toBeUndefined()
      expect(cacheGet(key2)).toBeUndefined()
      expect(cacheGet(key3)).toBeDefined() // tmpl-2 unaffected
    })

    it('does not throw when invalidating a non-existent template', () => {
      expect(() => invalidateTemplate('no-such-id')).not.toThrow()
    })
  })
})
