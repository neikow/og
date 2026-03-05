import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _imageCache,
  fetchAndCacheImage,
  resolveImageUrl,
} from '../../services/imageCache'
import { preloadImages } from '../../services/imagePreload'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchResponse(body: string, contentType: string, status = 200) {
  const bytes = new TextEncoder().encode(body)
  // Create an isolated ArrayBuffer so Buffer.from() doesn't pick up pooled noise
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h === 'content-type' ? contentType : null) },
    arrayBuffer: async () => ab,
  }
}

// ---------------------------------------------------------------------------
// imageCache
// ---------------------------------------------------------------------------

describe('imageCache – fetchAndCacheImage', () => {
  beforeEach(() => {
    _imageCache.clear()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches a remote URL and returns an entry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeFetchResponse('PNG_BYTES', 'image/png')),
    )

    const entry = await fetchAndCacheImage('https://example.com/img.png')
    expect(entry.mimeType).toBe('image/png')
    expect(entry.data.toString()).toBe('PNG_BYTES')
  })

  it('caches the result – fetch is only called once for the same URL', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(makeFetchResponse('BYTES', 'image/jpeg'))
    vi.stubGlobal('fetch', mockFetch)

    await fetchAndCacheImage('https://example.com/photo.jpg')
    await fetchAndCacheImage('https://example.com/photo.jpg')

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('detects MIME type from URL extension when Content-Type is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeFetchResponse('DATA', null as unknown as string)),
    )

    const entry = await fetchAndCacheImage('https://cdn.example.com/image.webp')
    expect(entry.mimeType).toBe('image/webp')
  })

  it('throws on non-OK HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeFetchResponse('Not Found', 'text/html', 404)),
    )

    await expect(fetchAndCacheImage('https://example.com/missing.png')).rejects.toThrow(
      'HTTP 404',
    )
  })
})

describe('imageCache – resolveImageUrl', () => {
  beforeEach(() => {
    _imageCache.clear()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes through an already-data URI unchanged', async () => {
    const dataUri = 'data:image/png;base64,abc123'
    expect(await resolveImageUrl(dataUri)).toBe(dataUri)
  })

  it('passes through a relative path unchanged', async () => {
    expect(await resolveImageUrl('/images/logo.png')).toBe('/images/logo.png')
  })

  it('passes through a non-http URL unchanged', async () => {
    expect(await resolveImageUrl('blob:http://localhost/123')).toBe(
      'blob:http://localhost/123',
    )
  })

  it('converts an http URL to a data URI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeFetchResponse('PNG', 'image/png')),
    )

    const result = await resolveImageUrl('https://example.com/img.png')
    const expected = `data:image/png;base64,${Buffer.from('PNG').toString('base64')}`
    expect(result).toBe(expected)
  })

  it('returns empty string for an empty input', async () => {
    expect(await resolveImageUrl('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// imagePreload
// ---------------------------------------------------------------------------

describe('preloadImages', () => {
  beforeEach(() => {
    _imageCache.clear()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns non-element nodes unchanged', async () => {
    expect(await preloadImages(null)).toBeNull()
    expect(await preloadImages('hello')).toBe('hello')
    expect(await preloadImages(42)).toBe(42)
  })

  it('replaces <img src> with a data URI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeFetchResponse('IMG', 'image/jpeg')),
    )

    const el = createElement('img', { src: 'https://example.com/photo.jpg' })
    const result = await preloadImages(el)
    const props = (result as React.ReactElement).props as { src: string }

    expect(props.src).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('does not modify <img src> when already a data URI', async () => {
    const src = 'data:image/png;base64,abc'
    const el = createElement('img', { src })
    const result = await preloadImages(el)
    const props = (result as React.ReactElement).props as { src: string }
    expect(props.src).toBe(src)
  })

  it('replaces backgroundImage url(...) with a data URI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeFetchResponse('BG', 'image/webp')),
    )

    const el = createElement('div', {
      style: { backgroundImage: 'url("https://example.com/bg.webp")' },
    })
    const result = await preloadImages(el)
    const style = ((result as React.ReactElement).props as { style: { backgroundImage: string } }).style
    expect(style.backgroundImage).toMatch(/^url\("data:image\/webp;base64,/)
  })

  it('leaves non-url backgroundImage values alone', async () => {
    const el = createElement('div', {
      style: { backgroundImage: 'linear-gradient(red, blue)' },
    })
    const result = await preloadImages(el)
    const style = ((result as React.ReactElement).props as { style: { backgroundImage: string } }).style
    expect(style.backgroundImage).toBe('linear-gradient(red, blue)')
  })

  it('recurses into children', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeFetchResponse('CHILD', 'image/png')),
    )

    const tree = createElement(
      'div',
      null,
      createElement('img', { src: 'https://example.com/child.png' }),
    )
    const result = await preloadImages(tree)
    const children = ((result as React.ReactElement).props as { children: React.ReactElement[] }).children
    const child = Array.isArray(children) ? children[0] : children
    const childProps = (child as React.ReactElement).props as { src: string }
    expect(childProps.src).toMatch(/^data:image\/png;base64,/)
  })

  it('only fetches each unique URL once across the tree', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(makeFetchResponse('DATA', 'image/png'))
    vi.stubGlobal('fetch', mockFetch)

    const url = 'https://example.com/shared.png'
    const tree = createElement(
      'div',
      null,
      createElement('img', { src: url }),
      createElement('img', { src: url }),
    )
    await preloadImages(tree)

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
