import { randomBytes } from 'node:crypto'
import { generateState, GitHub, OAuth2RequestError } from 'arctic'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { db } from '../db/client.js'
import { sessions } from '../db/schema.js'
import { env } from '../env.js'
import { sessionMiddleware } from '../middleware/session.js'

// Arctic v2 GitHub OAuth provider
const github = new GitHub(
  env.GITHUB_CLIENT_ID,
  env.GITHUB_CLIENT_SECRET,
  `${env.FRONTEND_URL.replace(':5173', ':3000')}/auth/callback/github`,
)

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export const authRouter = new Hono()

// GET /auth/github — redirect to GitHub OAuth
authRouter.get('/github', (c) => {
  const state = generateState()
  const url = github.createAuthorizationURL(state, ['user:email'])

  setCookie(c, 'github_oauth_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return c.redirect(url.toString())
})

// GET /auth/callback/github
authRouter.get('/callback/github', async (c) => {
  const { code, state } = c.req.query()
  const storedState = getCookie(c, 'github_oauth_state')

  if (!code || !state || state !== storedState) {
    return c.json({ error: 'Invalid OAuth state' }, 400)
  }

  try {
    const tokens = await github.validateAuthorizationCode(code)
    const accessToken = tokens.accessToken()

    // Fetch user's verified emails from GitHub
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'og-app',
        'Accept': 'application/vnd.github+json',
      },
    })

    if (!emailsRes.ok) {
      return c.json({ error: 'Failed to fetch GitHub emails' }, 502)
    }

    const githubEmails = (await emailsRes.json()) as Array<{
      email: string
      verified: boolean
      primary: boolean
    }>

    const verifiedEmails = githubEmails
      .filter(e => e.verified)
      .map(e => e.email.toLowerCase())

    const isAllowed = verifiedEmails.some(email =>
      env.ALLOWED_EMAILS.includes(email),
    )

    if (!isAllowed) {
      return c.redirect(
        `${env.FRONTEND_URL}/login?error=unauthorized`,
      )
    }

    // Fetch user profile for display info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'og-app',
        'Accept': 'application/vnd.github+json',
      },
    })
    const userProfile = (await userRes.json()) as {
      name?: string
      login: string
      avatar_url: string
    }

    // Create session
    const sessionId = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

    await db.insert(sessions).values({ id: sessionId, expiresAt })

    // Store minimal user info in session cookie (not sensitive)
    const userJson = JSON.stringify({
      email: verifiedEmails[0],
      name: userProfile.name ?? userProfile.login,
      avatarUrl: userProfile.avatar_url,
    })

    setCookie(c, 'session', sessionId, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    })

    // Store user info in a readable (non-httpOnly) cookie for the frontend
    setCookie(c, 'user', Buffer.from(userJson).toString('base64'), {
      httpOnly: false,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    })

    deleteCookie(c, 'github_oauth_state')

    return c.redirect(`${env.FRONTEND_URL}/dashboard`)
  }
  catch (err) {
    if (err instanceof OAuth2RequestError) {
      return c.json({ error: 'OAuth error', details: err.message }, 400)
    }
    throw err
  }
})

// GET /auth/me — return current user info
authRouter.get('/me', sessionMiddleware, (c) => {
  const userCookie = getCookie(c, 'user')
  if (!userCookie) {
    return c.json({ error: 'No user info' }, 401)
  }
  try {
    const user = JSON.parse(Buffer.from(userCookie, 'base64').toString())
    return c.json(user)
  }
  catch {
    return c.json({ error: 'Invalid user cookie' }, 400)
  }
})

// POST /auth/logout
authRouter.post('/logout', sessionMiddleware, async (c) => {
  const sessionId = getCookie(c, 'session')
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
  }
  deleteCookie(c, 'session', { path: '/' })
  deleteCookie(c, 'user', { path: '/' })
  return c.json({ ok: true })
})
