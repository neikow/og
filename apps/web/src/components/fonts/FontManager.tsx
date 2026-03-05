import type { Font } from '@og/shared'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { fontsApi } from '../../lib/api'
import { EmptyState, ListCard, SectionHeader } from '../ui'

export function FontManager() {
  const [fonts, setFonts] = useState<Font[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'upload' | 'google' | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadFonts()
  }, [])

  async function loadFonts() {
    try {
      setLoading(true)
      const data = await fontsApi.list()
      setFonts(data as Font[])
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fonts')
    }
    finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, family: string) {
    if (!confirm(`Delete font "${family}"?`))
      return
    try {
      await fontsApi.delete(id)
      setFonts(prev => prev.filter(f => f.id !== id))
      toast(`Font "${family}" deleted`, 'success')
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete font'
      setError(message)
      toast(message, 'error')
    }
  }

  return (
    <div>
      <SectionHeader title="Fonts">
        <button
          className="btn-secondary"
          onClick={() => setUploadMode(uploadMode === 'google' ? null : 'google')}
          data-testid="add-google-font-btn"
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Plus size={13} />
          Google Fonts
        </button>
        <button
          className="btn-primary"
          onClick={() => setUploadMode(uploadMode === 'upload' ? null : 'upload')}
          data-testid="upload-font-btn"
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Plus size={13} />
          Upload Font
        </button>
      </SectionHeader>

      {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

      {uploadMode === 'upload' && (
        <UploadFontForm
          onSuccess={(newFonts) => {
            setFonts(prev => [...prev, ...newFonts])
            setUploadMode(null)
          }}
          onCancel={() => setUploadMode(null)}
        />
      )}

      {uploadMode === 'google' && (
        <GoogleFontsForm
          onSuccess={(newFonts) => {
            setFonts(prev => [...prev, ...newFonts])
            setUploadMode(null)
          }}
          onCancel={() => setUploadMode(null)}
        />
      )}

      {loading
        ? (
            <p className="muted" data-testid="fonts-loading">Loading fonts…</p>
          )
        : fonts.length === 0
          ? (
              <EmptyState testId="fonts-empty">
                <p className="muted">No fonts yet. Upload a font file or add one from Google Fonts.</p>
              </EmptyState>
            )
          : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="fonts-list">
                {fonts.map(font => (
                  <ListCard key={font.id} style={{ padding: '10px 14px' }} testId={`font-item-${font.id}`}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{font.family}</span>
                      <span className="muted" style={{ marginLeft: 8 }}>
                        {font.weight}
                        {' '}
                        ·
                        {font.style}
                      </span>
                      <span
                        className={`badge ${font.source === 'google' ? 'badge-blue' : 'badge-green'}`}
                        style={{ marginLeft: 8 }}
                      >
                        {font.source}
                      </span>
                    </div>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(font.id, font.family)}
                      data-testid={`delete-font-${font.id}`}
                      style={{ fontSize: 12, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </ListCard>
                ))}
              </div>
            )}
    </div>
  )
}

// ─── Upload form ──────────────────────────────────────────────────────────────

function UploadFontForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (fonts: Font[]) => void
  onCancel: () => void
}) {
  const [family, setFamily] = useState('')
  const [weight, setWeight] = useState(400)
  const [style, setStyle] = useState<'normal' | 'italic'>('normal')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !family.trim())
      return

    try {
      setUploading(true)
      setError(null)
      const font = await fontsApi.upload(file, family.trim(), weight, style)
      toast(`Font "${family.trim()}" uploaded`, 'success')
      onSuccess([font])
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
      data-testid="upload-font-form"
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>Upload Font File</div>
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={family}
          onChange={e => setFamily(e.target.value)}
          placeholder="Font family (e.g. Inter)"
          required
          data-testid="upload-font-family"
          style={{ flex: 1, minWidth: 160 }}
        />
        <select
          value={weight}
          onChange={e => setWeight(Number(e.target.value))}
          data-testid="upload-font-weight"
        >
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
        <select
          value={style}
          onChange={e => setStyle(e.target.value as 'normal' | 'italic')}
          data-testid="upload-font-style"
        >
          <option value="normal">normal</option>
          <option value="italic">italic</option>
        </select>
      </div>
      <input
        type="file"
        ref={fileRef}
        accept=".ttf,.otf,.woff"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        required
        data-testid="upload-font-file"
        style={{ padding: 0, border: 'none', background: 'none', color: 'var(--text)' }}
      />
      <p className="muted" style={{ fontSize: 12 }}>Accepted: .ttf, .otf, .woff (WOFF2 not supported by Satori)</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={uploading || !file || !family.trim()}
          data-testid="upload-font-submit"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ─── Google Fonts form ────────────────────────────────────────────────────────

function GoogleFontsForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (fonts: Font[]) => void
  onCancel: () => void
}) {
  const [family, setFamily] = useState('')
  const [variantsRaw, setVariantsRaw] = useState('400,700')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!family.trim())
      return

    const variants = variantsRaw
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)

    try {
      setLoading(true)
      setError(null)
      const fonts = await fontsApi.addHosted({ family: family.trim(), variants })
      toast(`Google Font "${family.trim()}" added`, 'success')
      onSuccess(fonts)
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add Google Font'
      setError(message)
      toast(message, 'error')
    }
    finally {
      setLoading(false)
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
      data-testid="google-font-form"
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>Add Google Font</div>
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={family}
          onChange={e => setFamily(e.target.value)}
          placeholder="Family (e.g. Inter)"
          required
          data-testid="google-font-family"
          style={{ flex: 1 }}
        />
        <input
          value={variantsRaw}
          onChange={e => setVariantsRaw(e.target.value)}
          placeholder="Variants (e.g. 400,700,400italic)"
          data-testid="google-font-variants"
          style={{ flex: 1 }}
        />
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        Comma-separated variants: 400, 700, 400italic, 700italic
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !family.trim()}
          data-testid="google-font-submit"
        >
          {loading ? 'Fetching…' : 'Add Font'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
