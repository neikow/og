import type { Context, Next } from 'hono'
import { env } from '../env.js'

export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next()
  }
  catch (err) {
    const isDev = env.NODE_ENV === 'development'
    const message = err instanceof Error ? err.message : 'Internal server error'
    const stack = isDev && err instanceof Error ? err.stack : undefined

    console.error('[Error]', err)

    return c.json(
      {
        error: 'Internal server error',
        ...(isDev && { details: message, stack }),
      },
      500,
    )
  }
}
