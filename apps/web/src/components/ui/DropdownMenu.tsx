import { useEffect, useRef, useState } from 'react'

export interface DropdownMenuItem {
  label: string
  icon?: React.ReactNode
  danger?: boolean
  separator?: false
  testId?: string
  onClick: () => void
}

export interface DropdownMenuSeparator {
  separator: true
}

export type DropdownMenuEntry = DropdownMenuItem | DropdownMenuSeparator

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownMenuEntry[]
  testId?: string
}

export function DropdownMenu({ trigger, items, testId }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open)
      return

    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape')
        setOpen(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setOpen(prev => !prev)}
        data-testid={testId}
        style={{ display: 'inline-block' }}
      >
        {trigger}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 200,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            minWidth: 160,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}
        >
          {items.map((entry, i) => {
            if ('separator' in entry && entry.separator) {
              return (
                <div
                  key={i}
                  style={{
                    height: 1,
                    background: 'var(--border)',
                    margin: '4px 0',
                  }}
                />
              )
            }

            const item = entry as DropdownMenuItem
            return (
              <button
                key={i}
                data-testid={item.testId}
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 13,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: item.danger ? 'var(--danger)' : 'var(--text)',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'none'
                }}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
