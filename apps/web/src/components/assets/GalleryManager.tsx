import type { Asset } from '@og/shared'
import { Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { assetsApi } from '../../lib/api'
import { EmptyState, SectionHeader } from '../ui'

export function GalleryManager() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadAssets()
  }, [])

  async function loadAssets() {
    try {
      setLoading(true)
      const data = await assetsApi.list()
      setAssets(data)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery')
    }
    finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, identifier: string) {
    if (!confirm(`Delete asset "${identifier}"? This cannot be undone.`))
      return
    try {
      await assetsApi.delete(id)
      setAssets(prev => prev.filter(a => a.id !== id))
      toast(`Image "${identifier}" deleted`, 'success')
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete asset'
      setError(message)
      toast(message, 'error')
    }
  }

  return (
    <div>
      <SectionHeader title="Gallery">
        <button
          className="btn-primary"
          onClick={() => setShowUpload(v => !v)}
          data-testid="upload-asset-btn"
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Upload size={13} />
          Upload Image
        </button>
      </SectionHeader>

      {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

      {showUpload && (
        <UploadAssetForm
          onSuccess={(asset) => {
            setAssets(prev => [...prev, asset])
            setShowUpload(false)
          }}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {loading
        ? (
            <p className="muted" data-testid="gallery-loading">Loading gallery…</p>
          )
        : assets.length === 0
          ? (
              <EmptyState testId="gallery-empty">
                <p className="muted">No images yet.</p>
                <p className="muted" style={{ marginTop: 4 }}>
                  Upload images and reference them in templates using
                  {' '}
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-tertiary)',
                      padding: '1px 4px',
                      borderRadius: 3,
                    }}
                  >
                    Gallery.identifier
                  </code>
                  .
                </p>
              </EmptyState>
            )
          : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 12,
                }}
                data-testid="gallery-list"
              >
                {assets.map(asset => (
                  <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
                ))}
              </div>
            )}
    </div>
  )
}

// ─── Asset card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onDelete,
}: {
  asset: Asset
  onDelete: (id: string, identifier: string) => void
}) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
      data-testid={`asset-item-${asset.id}`}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: 90,
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={asset.url}
          alt={asset.identifier}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Info + actions */}
      <div style={{ padding: '8px 10px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
          title={`Gallery.${asset.identifier}`}
        >
          Gallery.
          {asset.identifier}
        </div>
        <div
          className="muted"
          style={{
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 8,
          }}
          title={asset.filename}
        >
          {asset.filename}
        </div>
        <button
          className="btn-danger"
          onClick={() => onDelete(asset.id, asset.identifier)}
          data-testid={`delete-asset-${asset.id}`}
          style={{ fontSize: 11, padding: '2px 8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <Trash2 size={11} />
          Delete
        </button>
      </div>
    </div>
  )
}

// ─── Upload form ──────────────────────────────────────────────────────────────

function UploadAssetForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (asset: Asset) => void
  onCancel: () => void
}) {
  const [identifier, setIdentifier] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !identifier.trim())
      return

    try {
      setUploading(true)
      setError(null)
      const asset = await assetsApi.upload(file, identifier.trim())
      toast(`Image "${identifier.trim()}" uploaded`, 'success')
      onSuccess(asset)
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      toast(message, 'error')
    }
    finally {
      setUploading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 16,
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      data-testid="upload-asset-form"
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>Upload Image</div>
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          placeholder="Identifier (e.g. hero_image)"
          required
          pattern="[a-zA-Z_][a-zA-Z0-9_]*"
          title="Letters, digits, and underscores only. Must start with a letter or underscore."
          data-testid="upload-asset-identifier"
          style={{ flex: 1 }}
        />
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
        Reference in templates as
        {' '}
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-tertiary)',
            padding: '1px 4px',
            borderRadius: 3,
          }}
        >
          Gallery.
          {identifier || 'identifier'}
        </code>
      </p>
      <input
        type="file"
        ref={fileRef}
        accept="image/*"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        required
        data-testid="upload-asset-file"
        style={{ padding: 0, border: 'none', background: 'none', color: 'var(--text)' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={uploading || !file || !identifier.trim()}
          data-testid="upload-asset-submit"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
