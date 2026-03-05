import type { Context, Next } from 'hono'
import { eq } from 'drizzle-orm'
import { getCookie } from 'hono/cookie'
import { db } from '../db/client'
import { sessions } from '../db/schema'

export async function sessionMiddleware(c: Context, next: Next) {
  const sessionId = getCookie(c, 'session')

  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session || session.expiresAt < new Date()) {
    // Clean up expired session
    if (session) {
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    }
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('sessionId', sessionId)
  await next()
}
