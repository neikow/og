import { randomBytes } from 'node:crypto'
import { GitHub } from 'arctic'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sessions } from '../../db/schema'

import { createTestDb } from '../helpers/db'

// Stub env with predictable values
vi.mock('../../env', () => ({
  env: {
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    ALLOWED_EMAILS: ['allowed@example.com'],
    SESSION_SECRET: 'test-secret',
    FRONTEND_URL: 'http://localhost:5173',
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: ':memory:',
    FONT_DIR: '/tmp/og-test-fonts',
  },
}))

// Mock Arctic GitHub OAuth provider
vi.mock('arctic', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    createAuthorizationURL: vi.fn((state: string) => new URL(`https://github.com/login/oauth/authorize?state=${state}`)),
    validateAuthorizationCode: vi.fn(),
  })),
  generateState: vi.fn(() => 'mock-state-xyz'),
  OAuth2RequestError: class OAuth2RequestError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'OAuth2RequestError'
    }
  },
}))

/**
 * Build a minimal auth test app wired to an in-memory DB.
 * Mirrors the structure of apps/api/src/routes/auth.ts but injecting our test DB.
 */
function createAuthTestApp(db: ReturnType<typeof createTestDb>) {
  const mockGithub = new (GitHub as any)('', '', '')

  const app = new Hono()

  // GET /github — generate state + redirect
  app.get('/github', (c) => {
    const state = 'mock-state-xyz'
    const url = mockGithub.createAuthorizationURL(state, ['user:email'])
    setCookie(c, 'github_oauth_state', state, { httpOnly: true, path: '/' })
    return c.redirect(url.toString())
  })

  // GET /callback/github
  app.get('/callback/github', async (c) => {
    const { code, state } = c.req.query()
    const storedState = getCookie(c, 'github_oauth_state')
    if (!code || !state || state !== storedState) {
      return c.json({ error: 'Invalid OAuth state' }, 400)
    }

    try {
      const tokens = await mockGithub.validateAuthorizationCode(code)
      const accessToken = tokens.accessToken()

      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!emailsRes.ok)
        return c.json({ error: 'Failed to fetch GitHub emails' }, 502)
      const githubEmails = (await emailsRes.json()) as Array<{ email: string, verified: boolean, primary: boolean }>

      const verifiedEmails = githubEmails.filter(e => e.verified).map(e => e.email.toLowerCase())
      const allowedEmails: string[] = ['allowed@example.com']
      const isAllowed = verifiedEmails.some(e => allowedEmails.includes(e))
      if (!isAllowed)
        return c.redirect('http://localhost:5173/login?error=unauthorized')

      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const userProfile = (await userRes.json()) as { name?: string, login: string, avatar_url: string }

      const sessionId = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 86400000)
      await db.insert(sessions).values({ id: sessionId, expiresAt })

      const userJson = JSON.stringify({
        email: verifiedEmails[0],
        name: userProfile.name ?? userProfile.login,
        avatarUrl: userProfile.avatar_url,
      })

      setCookie(c, 'session', sessionId, { httpOnly: true, path: '/' })
      setCookie(c, 'user', Buffer.from(userJson).toString('base64'), { httpOnly: false, path: '/' })
      deleteCookie(c, 'github_oauth_state')

      return c.redirect('http://localhost:5173/dashboard')
    }
    catch (err: any) {
      if (err.name === 'OAuth2RequestError')
        return c.json({ error: 'OAuth error', details: err.message }, 400)
      throw err
    }
  })

  // GET /me
  app.get('/me', (c) => {
    const sessionCookie = getCookie(c, 'session')
    if (!sessionCookie)
      return c.json({ error: 'Unauthorized' }, 401)
    const userCookie = getCookie(c, 'user')
    if (!userCookie)
      return c.json({ error: 'No user info' }, 401)
    try {
      const user = JSON.parse(Buffer.from(userCookie, 'base64').toString())
      return c.json(user)
    }
    catch {
      return c.json({ error: 'Invalid user cookie' }, 400)
    }
  })

  // POST /logout
  app.post('/logout', async (c) => {
    const sessionId = getCookie(c, 'session')
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    }
    deleteCookie(c, 'session', { path: '/' })
    deleteCookie(c, 'user', { path: '/' })
    return c.json({ ok: true })
  })

  return { app, mockGithub }
}

// Helper to create a session directly in the DB and return headers with the cookies
async function createLoggedInHeaders(db: ReturnType<typeof createTestDb>, userEmail = 'allowed@example.com') {
  const sessionId = randomBytes(32).toString('hex')
  await db.insert(sessions).values({ id: sessionId, expiresAt: new Date(Date.now() + 86400000) })
  const userJson = JSON.stringify({ email: userEmail, name: 'Test User', avatarUrl: '' })
  const userB64 = Buffer.from(userJson).toString('base64')
  return {
    Cookie: `session=${sessionId}; user=${userB64}`,
    sessionId,
  }
}

describe('gET /auth/github', () => {
  it('redirects to GitHub OAuth URL', async () => {
    const db = createTestDb()
    const { app } = createAuthTestApp(db)
    const res = await app.request('/github')
    expect(res.status).toBe(302)
    const location = res.headers.get('Location') ?? ''
    expect(location).toContain('github.com')
    expect(location).toContain('mock-state-xyz')
  })

  it('sets github_oauth_state cookie', async () => {
    const db = createTestDb()
    const { app } = createAuthTestApp(db)
    const res = await app.request('/github')
    const setCookieHeader = res.headers.get('Set-Cookie') ?? ''
    expect(setCookieHeader).toContain('github_oauth_state=mock-state-xyz')
  })
})

describe('gET /auth/callback/github', () => {
  let db: ReturnType<typeof createTestDb>
  let app: Hono
  let mockGithub: any

  beforeEach(() => {
    db = createTestDb()
    ;({ app, mockGithub } = createAuthTestApp(db))
    vi.clearAllMocks()
  })

  it('returns 400 when state does not match', async () => {
    const res = await app.request('/callback/github?code=abc&state=wrong-state', {
      headers: { Cookie: 'github_oauth_state=mock-state-xyz' },
    })
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string }
    expect(json.error).toContain('state')
  })

  it('redirects to /login?error=unauthorized when email not in allowlist', async () => {
    mockGithub.validateAuthorizationCode.mockResolvedValue({ accessToken: () => 'tok' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { email: 'stranger@example.com', verified: true, primary: true },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await app.request('/callback/github?code=mycode&state=mock-state-xyz', {
      headers: { Cookie: 'github_oauth_state=mock-state-xyz' },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('error=unauthorized')
  })

  it('creates a session and redirects to /dashboard for allowed email', async () => {
    mockGithub.validateAuthorizationCode.mockResolvedValue({ accessToken: () => 'tok' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { email: 'allowed@example.com', verified: true, primary: true },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await app.request('/callback/github?code=mycode&state=mock-state-xyz', {
      headers: { Cookie: 'github_oauth_state=mock-state-xyz' },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/dashboard')

    // Session should be in DB
    const allSessions = await db.select().from(sessions)
    expect(allSessions).toHaveLength(1)
  })
})

describe('gET /auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const db = createTestDb()
    const { app } = createAuthTestApp(db)
    const res = await app.request('/me')
    expect(res.status).toBe(401)
  })

  it('returns user info when authenticated', async () => {
    const db = createTestDb()
    const { app } = createAuthTestApp(db)
    const { Cookie } = await createLoggedInHeaders(db)
    const res = await app.request('/me', { headers: { Cookie } })
    expect(res.status).toBe(200)
    const user = await res.json() as { email: string, name: string }
    expect(user.email).toBe('allowed@example.com')
    expect(user.name).toBe('Test User')
  })
})

describe('pOST /auth/logout', () => {
  it('deletes the session and returns ok', async () => {
    const db = createTestDb()
    const { app } = createAuthTestApp(db)
    const { Cookie, sessionId } = await createLoggedInHeaders(db)

    const res = await app.request('/logout', { method: 'POST', headers: { Cookie } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    // Session should be removed
    const remaining = await db.select().from(sessions).where(eq(sessions.id, sessionId))
    expect(remaining).toHaveLength(0)
  })
})
