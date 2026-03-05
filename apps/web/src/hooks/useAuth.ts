import type { AuthUser } from '@og/shared'
import { useEffect, useState } from 'react'

function readUserCookie(): AuthUser | null {
  const cookies = document.cookie.split('; ')
  const userCookie = cookies.find(c => c.startsWith('user='))
  if (!userCookie)
    return null

  try {
    const encoded = userCookie.split('=')[1]
    return JSON.parse(atob(decodeURIComponent(encoded))) as AuthUser
  }
  catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cookieUser = readUserCookie()
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setUser(cookieUser)
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setLoading(false)
  }, [])

  return { user, loading, setUser }
}
