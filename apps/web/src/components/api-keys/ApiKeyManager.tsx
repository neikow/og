import type { ApiKey, CreateApiKeyResponse } from '@og/shared'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { apiKeysApi } from '../../lib/api'
import { EmptyState, ListCard, SectionHeader } from '../ui'
import { CreateApiKeyModal } from './CreateApiKeyModal'

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState<CreateApiKeyResponse | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadApiKeys()
  }, [])

  async function loadApiKeys() {
    try {
      setLoading(true)
      setError(null)
      const data = await apiKeysApi.list()
      setApiKeys(data)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    }
    finally {
      setLoading(false)
    }
  }

  async function handleCreate(name: string, tagRestrictions: string[]) {
    const result = await apiKeysApi.create({ name, tagRestrictions })
    setApiKeys(prev => [...prev, result.apiKey])
    setNewKeyResult(result)
    setShowCreateModal(false)
    toast(`API key "${name}" created`, 'success')
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`))
      return
    try {
      await apiKeysApi.delete(id)
      setApiKeys(prev => prev.filter(k => k.id !== id))
      toast(`API key "${name}" revoked`, 'success')
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke API key'
      setError(message)
      toast(message, 'error')
    }
  }

  return (
    <div>
      <SectionHeader title="API Keys">
        <button
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
          data-testid="create-api-key-btn"
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} />
          Create API Key
        </button>
      </SectionHeader>

      {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

      {showCreateModal && (
        <CreateApiKeyModal
          onCreate={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {newKeyResult && (
        <NewKeyBanner
          result={newKeyResult}
          onDismiss={() => setNewKeyResult(null)}
        />
      )}

      {loading
        ? (
            <p className="muted" data-testid="api-keys-loading">Loading API keys…</p>
          )
        : apiKeys.length === 0
          ? (
              <EmptyState testId="api-keys-empty">
                <p className="muted">No API keys yet. Create one to start generating images.</p>
              </EmptyState>
            )
          : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="api-keys-list">
                {apiKeys.map(key => (
                  <ListCard key={key.id} testId={`api-key-item-${key.id}`}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{key.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Created
                        {' '}
                        {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt
                          ? (
                              <>
                                {' '}
                                · Last used
                                {new Date(key.lastUsedAt).toLocaleDateString()}
                              </>
                            )
                          : (
                              <> · Never used</>
                            )}
                      </div>
                      {(key.tagRestrictions ?? []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {(key.tagRestrictions ?? []).map(tag => (
                            <span key={tag} className="badge" style={{ fontSize: 11 }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn-danger"
                      onClick={() => handleRevoke(key.id, key.name)}
                      data-testid={`revoke-api-key-${key.id}`}
                      style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <Trash2 size={13} />
                      Revoke
                    </button>
                  </ListCard>
                ))}
              </div>
            )}
    </div>
  )
}

function NewKeyBanner({ result, onDismiss }: { result: CreateApiKeyResponse, onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(result.rawKey)
    setCopied(true)
    setTimeout(setCopied, 2000, false)
  }

  return (
    <div
      style={{
        background: 'rgba(34,197,94,0.08)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: 'var(--radius)',
        padding: 16,
        marginBottom: 16,
      }}
      data-testid="new-key-banner"
    >
      <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 8 }}>
        API key created — copy it now, it won't be shown again
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <code
          style={{
            flex: 1,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius)',
            padding: '6px 10px',
            wordBreak: 'break-all',
          }}
          data-testid="new-key-value"
        >
          {result.rawKey}
        </code>
        <button className="btn-secondary" onClick={handleCopy} data-testid="copy-key-btn" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Copy size={13} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button className="btn-secondary" onClick={onDismiss} data-testid="dismiss-key-btn" style={{ fontSize: 13 }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
