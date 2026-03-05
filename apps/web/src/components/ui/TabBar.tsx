import type { ReactNode } from 'react'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (value: T) => void
  /** Visual size variant. Defaults to 'md'. */
  size?: 'sm' | 'md'
}

export function TabBar<T extends string>({ tabs, active, onChange, size = 'md' }: TabBarProps<T>) {
  const padding = size === 'sm' ? '6px 14px' : '8px 16px'
  const fontSize = size === 'sm' ? 13 : 14

  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          data-testid={`tab-${tab.value}`}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: active === tab.value ? '2px solid var(--accent)' : '2px solid transparent',
            borderRadius: 0,
            color: active === tab.value ? 'var(--text)' : 'var(--text-muted)',
            padding,
            fontSize,
            fontWeight: active === tab.value ? 600 : 400,
            transition: 'color 0.15s',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
