import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { TagInput } from '../ui'

interface CreateApiKeyModalProps {
  onCreate: (name: string, tagRestrictions: string[]) => Promise<void>
  onClose: () => void
}

export function CreateApiKeyModal({ onCreate, onClose }: CreateApiKeyModalProps) {
  const [name, setName] = useState('')
  const [tagRestrictions, setTagRestrictions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim())
      return

    try {
      setLoading(true)
      setError(null)
      await onCreate(name.trim(), tagRestrictions)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key')
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      data-testid="create-api-key-modal"
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 24,
          width: '100%',
          maxWidth: 420,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Create API Key"
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Create API Key</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <p className="error-text">{error}</p>}

          <div>
            <label
              htmlFor="api-key-name"
              style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--text-muted)' }}
            >
              Key name
            </label>
            <input
              id="api-key-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Production, CI/CD"
              autoFocus
              required
              style={{ width: '100%' }}
              data-testid="api-key-name-input"
            />
          </div>

          <div>
            <label
              style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--text-muted)' }}
            >
              Tag restrictions
              {' '}
              <span className="muted" style={{ fontWeight: 400 }}>(leave empty to allow all templates)</span>
            </label>
            <TagInput
              tags={tagRestrictions}
              onChange={setTagRestrictions}
              placeholder="Add tag restriction…"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              data-testid="modal-cancel-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <X size={14} />
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !name.trim()}
              data-testid="modal-create-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={14} />
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
