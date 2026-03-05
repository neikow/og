import type { CssDiagnostic } from '../../lib/cssAnalyzer'

export interface RenderError {
  message: string
  details?: string
}

interface DiagnosticsPanelProps {
  error: RenderError | null
  warnings: CssDiagnostic[]
}

export function DiagnosticsPanel({ error, warnings }: DiagnosticsPanelProps) {
  const hasError = !!error
  const hasWarnings = warnings.length > 0

  if (!hasError && !hasWarnings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 60 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No issues detected</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Render error */}
      {error && (
        <div
          data-testid="diag-error"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius)',
            padding: '8px 10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🔴</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#f87171', fontWeight: 600, marginBottom: error.details ? 4 : 0 }}>
                {error.message}
              </div>
              {error.details && (
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {error.details}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS warnings */}
      {warnings.map((w, idx) => (
        <div
          key={idx}
          data-testid={`diag-warning-${idx}`}
          style={{
            background: 'rgba(234,179,8,0.08)',
            border: '1px solid rgba(234,179,8,0.25)',
            borderRadius: 'var(--radius)',
            padding: '8px 10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🟡</span>
            <div style={{ minWidth: 0 }}>
              {w.selector && (
                <code
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 2,
                  }}
                >
                  {w.selector}
                </code>
              )}
              <div style={{ fontSize: 13, color: '#fde047' }}>
                {w.message}
              </div>
              {w.declaration && (
                <code
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 3,
                  }}
                >
                  {w.declaration}
                </code>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Returns the badge element to render in the tab bar button for the diagnostics tab.
 * null = no badge (no issues), otherwise a small colored count badge.
 */
export function DiagnosticsBadge({
  error,
  warningCount,
}: {
  error: boolean
  warningCount: number
}) {
  if (!error && warningCount === 0)
    return null

  if (error) {
    return (
      <span
        data-testid="diag-badge-error"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#ef4444',
          marginLeft: 5,
          verticalAlign: 'middle',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <span
      data-testid="diag-badge-warning"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: '#eab308',
        marginLeft: 5,
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    />
  )
}
