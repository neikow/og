import type { EditorSettings } from '../../hooks/useEditorSettings'
import { useEffect, useRef } from 'react'

interface EditorSettingsPanelProps {
  settings: EditorSettings
  onUpdate: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void
  onClose: () => void
}

const stepBtn: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text)',
  fontSize: 14,
  width: 26,
  height: 26,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  lineHeight: 1,
}

export function EditorSettingsPanel({ settings, onUpdate, onClose }: EditorSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape')
        onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '5px 0',
  }

  const label: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--text)',
    flexShrink: 0,
  }

  const muted: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 1,
  }

  return (
    <div
      ref={panelRef}
      data-testid="editor-settings-panel"
      style={{
        position: 'absolute',
        top: 44,
        right: 0,
        zIndex: 200,
        width: 280,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        padding: '12px 16px',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Editor Settings
      </div>

      {/* Word Wrap */}
      <div style={row}>
        <div>
          <div style={label}>Word Wrap</div>
          <div style={muted}>Break long lines</div>
        </div>
        <Toggle
          checked={settings.wordWrap === 'on'}
          onChange={v => onUpdate('wordWrap', v ? 'on' : 'off')}
          testId="setting-wordwrap"
        />
      </div>

      {/* Line Numbers */}
      <div style={row}>
        <div>
          <div style={label}>Line Numbers</div>
        </div>
        <Toggle
          checked={settings.lineNumbers === 'on'}
          onChange={v => onUpdate('lineNumbers', v ? 'on' : 'off')}
          testId="setting-linenumbers"
        />
      </div>

      {/* Minimap */}
      <div style={row}>
        <div>
          <div style={label}>Minimap</div>
        </div>
        <Toggle
          checked={settings.minimap}
          onChange={v => onUpdate('minimap', v)}
          testId="setting-minimap"
        />
      </div>

      {/* Format on Paste */}
      <div style={row}>
        <div>
          <div style={label}>Format on Paste</div>
        </div>
        <Toggle
          checked={settings.formatOnPaste}
          onChange={v => onUpdate('formatOnPaste', v)}
          testId="setting-formatonpaste"
        />
      </div>

      {/* Format on Save */}
      <div style={row}>
        <div>
          <div style={label}>Format on Save</div>
          <div style={muted}>Auto-format on Cmd+S</div>
        </div>
        <Toggle
          checked={settings.formatOnSave}
          onChange={v => onUpdate('formatOnSave', v)}
          testId="setting-formatonsave"
        />
      </div>

      {/* Render Whitespace */}
      <div style={row}>
        <div>
          <div style={label}>Render Whitespace</div>
        </div>
        <select
          data-testid="setting-renderwhitespace"
          value={settings.renderWhitespace}
          onChange={e => onUpdate('renderWhitespace', e.target.value as EditorSettings['renderWhitespace'])}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text)',
            fontSize: 12,
            padding: '3px 6px',
          }}
        >
          <option value="none">None</option>
          <option value="boundary">Boundary</option>
          <option value="selection">Selection</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Tab Size */}
      <div style={row}>
        <div>
          <div style={label}>Tab Size</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {([2, 4] as const).map(n => (
            <button
              key={n}
              data-testid={`setting-tabsize-${n}`}
              onClick={() => onUpdate('tabSize', n)}
              style={{
                background: settings.tabSize === n ? 'var(--accent)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: settings.tabSize === n ? '#fff' : 'var(--text)',
                fontSize: 12,
                padding: '3px 10px',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div style={row}>
        <div>
          <div style={label}>Font Size</div>
          <div style={muted}>
            {settings.fontSize}
            px
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            data-testid="setting-fontsize-dec"
            onClick={() => onUpdate('fontSize', Math.max(10, settings.fontSize - 1))}
            style={stepBtn}
          >
            −
          </button>
          <span style={{ fontSize: 13, minWidth: 24, textAlign: 'center' }}>{settings.fontSize}</span>
          <button
            data-testid="setting-fontsize-inc"
            onClick={() => onUpdate('fontSize', Math.min(24, settings.fontSize + 1))}
            style={stepBtn}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  testId?: string
}

function Toggle({ checked, onChange, testId }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        background: checked ? 'var(--accent)' : 'var(--bg-tertiary)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
        }}
      />
    </button>
  )
}
