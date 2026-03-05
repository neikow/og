import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  children?: ReactNode
}

/**
 * A row with a section title on the left and optional action(s) on the right.
 * Used at the top of manager panels (Templates, API Keys, Fonts, Gallery).
 */
export function SectionHeader({ title, children }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
      {children && <div style={{ display: 'flex', gap: 8 }}>{children}</div>}
    </div>
  )
}
