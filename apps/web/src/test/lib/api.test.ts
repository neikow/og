import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiKeysApi, auth, fontsApi, previewApi, templatesApi } from '../../lib/api'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock URL.createObjectURL
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn(() => 'blob:mock-url'),
})

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function mockBlobResponse(status = 200) {
  return Promise.resolve(
    new Response(new Blob(['fake-png'], { type: 'image/png' }), {
      status,
      headers: { 'Content-Type': 'image/png' },
    }),
  )
}

describe('apiError', () => {
  it('stores message, status, and details', () => {
    const err = new ApiError('Not found', 404, 'Template does not exist')
    expect(err.message).toBe('Not found')
    expect(err.status).toBe(404)
    expect(err.details).toBe('Template does not exist')
    expect(err.name).toBe('ApiError')
  })
})

describe('auth API', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.clearAllMocks())

  it('me() calls GET /auth/me', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ email: 'user@example.com', name: 'User', avatarUrl: '' }))
    const result = await auth.me()
    expect(mockFetch).toHaveBeenCalledWith('/auth/me', expect.objectContaining({ credentials: 'include' }))
    expect(result).toMatchObject({ email: 'user@example.com' })
  })

  it('logout() calls POST /auth/logout', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
    await auth.logout()
    expect(mockFetch).toHaveBeenCalledWith('/auth/logout', expect.objectContaining({ method: 'POST' }))
  })
})

describe('templatesApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list() calls GET /templates', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse([]))
    await templatesApi.list()
    expect(mockFetch).toHaveBeenCalledWith('/templates', expect.anything())
  })

  it('get() calls GET /templates/:id', async () => {
    const template = { id: 'abc', name: 'T', code: '', variableSchema: [], fonts: [], createdAt: '', updatedAt: '' }
    mockFetch.mockResolvedValue(mockJsonResponse(template))
    const result = await templatesApi.get('abc')
    expect(mockFetch).toHaveBeenCalledWith('/templates/abc', expect.anything())
    expect(result.id).toBe('abc')
  })

  it('create() calls POST /templates with JSON body', async () => {
    const input = { name: 'New', code: '', variableSchema: [], fontIds: [] }
    const created = { id: 'new-1', ...input, fonts: [], createdAt: '', updatedAt: '' }
    mockFetch.mockResolvedValue(mockJsonResponse(created, 200))
    await templatesApi.create(input)
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toMatchObject(input)
  })

  it('update() calls PUT /templates/:id', async () => {
    const updated = { id: 'tpl-1', name: 'T', code: 'new', variableSchema: [], fonts: [], createdAt: '', updatedAt: '' }
    mockFetch.mockResolvedValue(mockJsonResponse(updated))
    await templatesApi.update('tpl-1', { code: 'new' })
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/templates/tpl-1')
    expect(init.method).toBe('PUT')
  })

  it('delete() calls DELETE /templates/:id', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
    await templatesApi.delete('tpl-1')
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/templates/tpl-1')
    expect(init.method).toBe('DELETE')
  })

  it('throws ApiError with status on non-ok response', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ error: 'Not found' }, 404))
    await expect(templatesApi.get('missing')).rejects.toThrow(ApiError)
    await expect(templatesApi.get('missing')).rejects.toMatchObject({ status: 404 })
  })

  it('redirects to /login on 401', async () => {
    const originalLocation = window.location
    // @ts-expect-error jsdom location mock
    delete window.location
    window.location = { href: '' } as Location

    mockFetch.mockResolvedValue(new Response(null, { status: 401 }))
    await expect(templatesApi.list()).rejects.toMatchObject({ status: 401 })
    expect(window.location.href).toBe('/login')

    window.location = originalLocation
  })
})

describe('previewApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('render() calls POST /preview and returns an object URL', async () => {
    mockFetch.mockResolvedValue(mockBlobResponse())
    const url = await previewApi.render({ code: 'x', variables: {}, fontIds: [] })
    const [path, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/preview')
    expect(init.method).toBe('POST')
    expect(url).toBe('blob:mock-url')
  })
})

describe('fontsApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list() calls GET /fonts', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse([]))
    await fontsApi.list()
    expect(mockFetch).toHaveBeenCalledWith('/fonts', expect.anything())
  })

  it('delete() calls DELETE /fonts/:id', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
    await fontsApi.delete('f1')
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/fonts/f1')
    expect(init.method).toBe('DELETE')
  })
})

describe('apiKeysApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list() calls GET /api-keys', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse([]))
    await apiKeysApi.list()
    expect(mockFetch).toHaveBeenCalledWith('/api-keys', expect.anything())
  })

  it('create() calls POST /api-keys with name', async () => {
    const response = { apiKey: { id: 'k1', name: 'Key', createdAt: '', lastUsedAt: null }, rawKey: 'og_abc' }
    mockFetch.mockResolvedValue(mockJsonResponse(response))
    await apiKeysApi.create({ name: 'Key' })
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api-keys')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Key' })
  })

  it('delete() calls DELETE /api-keys/:id', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
    await apiKeysApi.delete('k1')
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api-keys/k1')
    expect(init.method).toBe('DELETE')
  })
})
