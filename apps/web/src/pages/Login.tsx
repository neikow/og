import { useSearchParams } from 'react-router-dom'

export function Login() {
  const [params] = useSearchParams()
  const error = params.get('error')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 24,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>OG Image Generator</h1>
        <p className="muted">Sign in to manage your Open Graph image templates</p>
      </div>

      {error === 'unauthorized' && (
        <div
          className="error-text"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius)',
            padding: '10px 16px',
          }}
          data-testid="login-error"
        >
          Your GitHub account is not authorized to access this app.
        </div>
      )}

      <a
        href="/auth/github"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: '#24292e',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 'var(--radius)',
          fontWeight: 500,
          fontSize: 15,
          textDecoration: 'none',
          border: '1px solid #444',
          transition: 'background 0.15s',
        }}
        data-testid="github-login-btn"
      >
        <GitHubIcon />
        Sign in with GitHub
      </a>
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}
