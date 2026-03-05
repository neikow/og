import type { Context, Next } from 'hono'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { apiKeys } from '../db/schema'

export async function apiKeyMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', details: 'Missing or invalid Authorization header' }, 401)
  }

  const rawKey = authHeader.slice(7)
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1)

  if (!apiKey) {
    return c.json({ error: 'Unauthorized', details: 'Invalid API key' }, 401)
  }

  // Update lastUsedAt without blocking the request
  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, apiKey.id))
    .run()

  c.set('apiKeyId', apiKey.id)
  c.set('apiKeyTagRestrictions', apiKey.tagRestrictions as string[])
  await next()
}
