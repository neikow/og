import { X } from 'lucide-react'

interface Props {
  tag: string
  onDismiss: () => void
}

/**
 * A slim sticky footer banner shown when the running image is behind `latest`.
 * Dismissed by the user; won't reappear until the next release.
 */
export function UpdateBanner({ tag, onDismiss }: Props) {
  return (
    <div
      data-testid="update-banner"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontSize: 13,
        zIndex: 100,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--accent)',
          flexShrink: 0,
        }}
      />
      <span style={{ color: 'var(--text-muted)' }}>
        A new version is available.{' '}
        <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {tag}
        </span>
        {' '}is not the latest release.{' '}
        <a
          href="https://github.com/neikow/og/releases"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)' }}
        >
          View releases
        </a>
      </span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss update notification"
        data-testid="update-banner-dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 4,
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          marginLeft: 4,
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
