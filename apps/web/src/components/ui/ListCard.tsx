import type { CSSProperties, ReactNode } from 'react'

interface ListCardProps {
  children: ReactNode
  style?: CSSProperties
  testId?: string
}

/**
 * A bordered, rounded card used for rows in list views
 * (template list, API key list, font list, etc.).
 */
export function ListCard({ children, style, testId }: ListCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        ...style,
      }}
      data-testid={testId}
    >
      {children}
    </div>
  )
}
