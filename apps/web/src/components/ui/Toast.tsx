import type { ReactNode } from 'react'
import type { Toast, ToastVariant } from '../../providers/toastContext'
import { CheckCircle, Info, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 3000,
  info: 3500,
  error: 6000,
}

export function ToastList({ toasts, onDismiss }: { toasts: Toast[], onDismiss: (id: string) => void }) {
  if (toasts.length === 0)
    return null

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ─── Single toast item ────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { border: string }> = {
  success: { border: 'rgba(34,197,94,0.4)' },
  error: { border: 'rgba(239,68,68,0.4)' },
  info: { border: 'rgba(59,130,246,0.4)' },
}

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  info: 'var(--accent)',
}

const VARIANT_ICON: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle size={16} />,
  error: <XCircle size={16} />,
  info: <Info size={16} />,
}

function ToastItem({ toast, onDismiss }: { toast: Toast, onDismiss: (id: string) => void }) {
  const { id, message, variant } = toast
  const { border } = VARIANT_STYLES[variant]
  const iconColor = VARIANT_ICON_COLOR[variant]
  const icon = VARIANT_ICON[variant]

  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))

    timerRef.current = setTimeout(() => {
      setVisible(false)
      // eslint-disable-next-line react-web-api/no-leaked-timeout
      setTimeout(onDismiss, 250, id)
    }, AUTO_DISMISS_MS[variant])

    return () => {
      cancelAnimationFrame(raf)
      if (timerRef.current)
        clearTimeout(timerRef.current)
    }
  }, [id, variant, onDismiss])

  function handleDismiss() {
    setVisible(false)
    setTimeout(onDismiss, 250, id)
  }

  return (
    <div
      role="alert"
      data-testid={`toast-${variant}`}
      onClick={handleDismiss}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: 'var(--bg-secondary)',
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius)',
        padding: '10px 14px',
        minWidth: 240,
        maxWidth: 380,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        userSelect: 'none',
      }}
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          marginTop: 1,
        }}
      >
        {icon}
      </span>

      {/* Message */}
      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>
        {message}
      </span>
    </div>
  )
}
