import type { ReactNode } from 'react'

interface EmptyStateProps {
  children: ReactNode
  /** data-testid forwarded to the container div */
  testId?: string
}

/**
 * A centered, dashed-border placeholder shown when a list is empty.
 */
export function EmptyState({ children, testId }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius)',
      }}
      data-testid={testId}
    >
      {children}
    </div>
  )
}
