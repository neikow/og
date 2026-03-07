import type {
  AddHostedFontInput,
  ApiKey,
  Asset,
  AuthUser,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  CreateTemplateInput,
  Font,
  PreviewInput,
  Template,
  TemplateWithFonts,
  UpdateTemplateInput,
} from '@og/shared'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body && typeof init.body === 'string'
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init.headers,
    },
  })

  if (res.status === 401) {
    // Redirect to login on auth failure
    window.location.href = '/login'
    throw new ApiError('Unauthorized', 401)
  }

  if (!res.ok) {
    let errorBody: { error?: string, details?: string } = {}
    try {
      errorBody = await res.json()
    }
    catch {
      // ignore parse failure
    }
    throw new ApiError(
      errorBody.error ?? `HTTP ${res.status}`,
      res.status,
      errorBody.details,
    )
  }

  // For binary responses (PNG preview)
  const contentType = res.headers.get('Content-Type') ?? ''
  if (contentType.includes('image/')) {
    return res.blob() as unknown as T
  }

  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  me: () => request<AuthUser>('/auth/me'),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const templatesApi = {
  list: (opts?: { tag?: string }) => {
    const url = opts?.tag ? `/templates?tag=${encodeURIComponent(opts.tag)}` : '/templates'
    return request<Template[]>(url)
  },

  get: (id: string) => request<TemplateWithFonts>(`/templates/${id}`),

  create: (input: CreateTemplateInput) =>
    request<TemplateWithFonts>('/templates', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateTemplateInput) =>
    request<TemplateWithFonts>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    request<{ ok: true }>(`/templates/${id}`, { method: 'DELETE' }),
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export const previewApi = {
  render: async (input: PreviewInput): Promise<string> => {
    const blob = await request<Blob>('/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return URL.createObjectURL(blob)
  },

  debug: async (input: PreviewInput): Promise<string> => {
    const res = await fetch('/preview/debug', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      let errorBody: { error?: string, details?: string } = {}
      try {
        errorBody = await res.json()
      }
      catch { /* ignore */ }
      throw new ApiError(errorBody.error ?? `HTTP ${res.status}`, res.status, errorBody.details)
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },
}

// ─── Fonts ────────────────────────────────────────────────────────────────────

export const fontsApi = {
  list: () =>
    request<Omit<Font, 'filePath'>[]>('/fonts'),

  upload: (file: File, family: string, weight: number, style: 'normal' | 'italic') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('family', family)
    fd.append('weight', String(weight))
    fd.append('style', style)
    return request<Font>('/fonts/upload', { method: 'POST', body: fd })
  },

  addHosted: (input: AddHostedFontInput) =>
    request<Font[]>('/fonts/hosted', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    request<{ ok: true }>(`/fonts/${id}`, { method: 'DELETE' }),
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeysApi = {
  list: () => request<ApiKey[]>('/api-keys'),

  create: (input: CreateApiKeyInput) =>
    request<CreateApiKeyResponse>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    request<{ ok: true }>(`/api-keys/${id}`, { method: 'DELETE' }),
}

// ─── Assets (Gallery) ─────────────────────────────────────────────────────────

export const assetsApi = {
  list: () => request<Asset[]>('/assets'),

  upload: (file: File, identifier: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('identifier', identifier)
    return request<Asset>('/assets', { method: 'POST', body: fd })
  },

  delete: (id: string) =>
    request<{ ok: true }>(`/assets/${id}`, { method: 'DELETE' }),
}

// ─── Update check ─────────────────────────────────────────────────────────────

export interface VersionInfo {
  tag: string
  sha: string | null
  updateAvailable: boolean
  latestSha: string | null
}

export const updateApi = {
  check: () => request<VersionInfo>('/health/version'),
}
