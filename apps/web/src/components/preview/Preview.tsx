// Open Graph standard dimensions
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630
export const OG_ASPECT = OG_WIDTH / OG_HEIGHT // ~1.905

interface PreviewProps {
  url: string | null
  loading: boolean
  error: string | null
}

export function Preview({ url, loading, error }: PreviewProps) {
  return (
    // Outer shell: fills the container, centers the OG box
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
      data-testid="preview-container"
    >
      {/*
        Inner OG-ratio box.
        We use a padding-bottom trick to lock the aspect ratio:
        padding-bottom = 100% / aspectRatio as a percentage of the *width*.
        The box is constrained to at most the available width/height.
      */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: `min(100%, calc(100vh * ${OG_ASPECT.toFixed(4)}))`,
          aspectRatio: `${OG_WIDTH} / ${OG_HEIGHT}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {error
          ? (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  maxWidth: 400,
                }}
                data-testid="preview-error"
              >
                <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>
                  Preview Error
                </div>
                <pre
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {error}
                </pre>
              </div>
            )
          : url
            ? (
                <>
                  {loading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                      }}
                      data-testid="preview-overlay-loading"
                    >
                      <span className="muted">Rendering…</span>
                    </div>
                  )}
                  <img
                    src={url}
                    alt="OG preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      opacity: loading ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                    data-testid="preview-image"
                  />
                </>
              )
            : loading
              ? (
                  <span className="muted" data-testid="preview-loading">Rendering…</span>
                )
              : (
                  <span className="muted" data-testid="preview-placeholder">
                    Preview will appear here
                  </span>
                )}
      </div>
    </div>
  )
}
