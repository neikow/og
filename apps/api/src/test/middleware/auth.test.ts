import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sessions } from '../../db/schema'
import { createTestDb } from '../helpers/db'

// We need to test the middleware in isolation using a mock Hono app
describe('middleware: api-key', () => {
  it('rejects requests without Authorization header', async () => {
    // Import and test the logic directly
    const { apiKeyMiddleware } = await import('../../middleware/api-key')
    const mockNext = vi.fn()
    const mockContext = {
      req: { header: () => undefined },
      json: (body: unknown, status: number) => ({ body, status }),
      set: vi.fn(),
    }
    const result = await apiKeyMiddleware(mockContext as never, mockNext)
    expect((result as { status: number }).status).toBe(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('rejects requests with wrong Bearer format', async () => {
    const { apiKeyMiddleware } = await import('../../middleware/api-key')
    const mockNext = vi.fn()
    const mockContext = {
      req: { header: () => 'Basic sometoken' },
      json: (body: unknown, status: number) => ({ body, status }),
      set: vi.fn(),
    }
    const result = await apiKeyMiddleware(mockContext as never, mockNext)
    expect((result as { status: number }).status).toBe(401)
  })
})

describe('middleware: session', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()
  })

  /**
   * Build a minimal Hono app that replicates sessionMiddleware logic
   * using the test-local DB so we can issue real HTTP requests.
   */
  function buildApp() {
    const app = new Hono()
    app.use('*', async (c, next) => {
      const sessionId = getCookie(c, 'session')
      if (!sessionId)
        return c.json({ error: 'Unauthorized' }, 401)

      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)

      if (!session || session.expiresAt < new Date()) {
        if (session)
          await db.delete(sessions).where(eq(sessions.id, sessionId))
        return c.json({ error: 'Unauthorized' }, 401)
      }

      c.set('sessionId', sessionId)
      await next()
    })
    app.get('/protected', c => c.json({ ok: true }))
    return app
  }

  it('rejects requests without session cookie', async () => {
    const app = buildApp()
    const res = await app.request('/protected')
    expect(res.status).toBe(401)
  })

  it('rejects requests with an unknown session id', async () => {
    const app = buildApp()
    const res = await app.request('/protected', {
      headers: { Cookie: 'session=no-such-session' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects requests with an expired session', async () => {
    const sessionId = randomBytes(16).toString('hex')
    await db.insert(sessions).values({
      id: sessionId,
      expiresAt: new Date(Date.now() - 1000), // already expired
    })

    const app = buildApp()
    const res = await app.request('/protected', {
      headers: { Cookie: `session=${sessionId}` },
    })
    expect(res.status).toBe(401)
  })

  it('passes through requests with a valid session', async () => {
    const sessionId = randomBytes(16).toString('hex')
    await db.insert(sessions).values({
      id: sessionId,
      expiresAt: new Date(Date.now() + 86400_000),
    })

    const app = buildApp()
    const res = await app.request('/protected', {
      headers: { Cookie: `session=${sessionId}` },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
