import { useCallback, useRef, useState } from 'react'

const STORAGE_KEY = 'og:editor-split'
const DEFAULT_RIGHT_PCT = 45
const MIN_PCT = 20
const MAX_PCT = 75

function loadPct(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === null)
      return DEFAULT_RIGHT_PCT
    const n = Number.parseFloat(v)
    return Number.isNaN(n) ? DEFAULT_RIGHT_PCT : Math.min(MAX_PCT, Math.max(MIN_PCT, n))
  }
  catch {
    return DEFAULT_RIGHT_PCT
  }
}

/**
 * Returns the right-panel width as a percentage and a drag-handle onMouseDown
 * handler that lets the user resize by dragging.
 */
export function useResizableSplit() {
  const [rightPct, setRightPct] = useState<number>(loadPct)
  const draggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true

    function onMove(ev: MouseEvent) {
      if (!draggingRef.current || !containerRef.current)
        return
      const rect = containerRef.current.getBoundingClientRect()
      const totalWidth = rect.width
      const rightWidth = rect.right - ev.clientX
      const pct = Math.min(MAX_PCT, Math.max(MIN_PCT, (rightWidth / totalWidth) * 100))
      setRightPct(pct)
    }

    function onUp() {
      if (!draggingRef.current)
        return
      draggingRef.current = false
      // Persist after drag ends
      setRightPct((prev) => {
        try {
          localStorage.setItem(STORAGE_KEY, String(prev))
        }
        catch { /* ignore */ }
        return prev
      })
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return { rightPct, containerRef, onMouseDown }
}
