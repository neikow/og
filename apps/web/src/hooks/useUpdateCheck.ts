import { useEffect, useState } from 'react'
import type { VersionInfo } from '../lib/api'
import { updateApi } from '../lib/api'

const STORAGE_KEY = 'og:dismissed-update'

/**
 * Polls GET /health/version once on mount and returns:
 *  - `updateAvailable`  whether the running image is behind `latest`
 *  - `versionInfo`      the raw payload from the server
 *  - `dismiss()`        stores the current latestSha so the banner won't
 *                       reappear until a newer release ships
 */
export function useUpdateCheck() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const info = await updateApi.check()
        if (cancelled)
          return

        setVersionInfo(info)

        if (!info.updateAvailable)
          return

        // Suppress the banner if the user already dismissed this exact release
        const dismissed = localStorage.getItem(STORAGE_KEY)
        if (dismissed && dismissed === info.latestSha)
          return

        setUpdateAvailable(true)
      }
      catch {
        // Silently ignore — update check is best-effort
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  function dismiss() {
    if (versionInfo?.latestSha) {
      localStorage.setItem(STORAGE_KEY, versionInfo.latestSha)
    }
    setUpdateAvailable(false)
  }

  return { updateAvailable, versionInfo, dismiss }
}
