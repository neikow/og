import type { ToastContextValue } from '../providers/toastContext'
import { useContext } from 'react'
import { ToastContext } from '../providers/toastContext'

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx)
    throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
