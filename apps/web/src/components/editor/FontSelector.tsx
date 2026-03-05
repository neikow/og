import type { Font } from '@og/shared'
import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { fontsApi } from '../../lib/api'

interface FontSelectorProps {
  allFonts: Font[]
  selectedFontIds: string[]
  onChange: (ids: string[]) => void
  /** Called when new fonts are added so the editor can update its font list. */
  onFontsAdded?: (fonts: Font[]) => void
}

type AddMode = 'google' | 'upload' | null

export function FontSelector({ allFonts, selectedFontIds, onChange, onFontsAdded }: FontSelectorProps) {
  const [search, setSearch] = useState('')
  const [addMode, setAddMode] = useState<AddMode>(null)

  function toggle(id: string) {
    if (selectedFontIds.includes(id)) {
      onChange(selectedFontIds.filter(fid => fid !== id))
    }
    else {
      onChange([...selectedFontIds, id])
    }
  }

  function handleAdded(fonts: Font[]) {
    onFontsAdded?.(fonts)
    setAddMode(null)
  }

  const filtered = search.trim()
    ? allFonts.filter(f => f.family.toLowerCase().includes(search.trim().toLowerCase()))
    : allFonts

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Toolbar: search + add buttons */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search fonts…"
          data-testid="font-selector-search"
          style={{ flex: 1, fontSize: 12, padding: '3px 8px' }}
        />
        <button
          className="btn-secondary"
          onClick={() => setAddMode(addMode === 'google' ? null : 'google')}
          data-testid="font-selector-add-google"
          style={{ fontSize: 12, padding: '3px 8px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Plus size={12} />
          Google
        </button>
        <button
          className="btn-secondary"
          onClick={() => setAddMode(addMode === 'upload' ? null : 'upload')}
          data-testid="font-selector-add-upload"
          style={{ fontSize: 12, padding: '3px 8px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Plus size={12} />
          Upload
        </button>
      </div>

      {/* Inline add forms */}
      {addMode === 'google' && (
        <GoogleFontForm onSuccess={handleAdded} onCancel={() => setAddMode(null)} />
      )}
      {addMode === 'upload' && (
        <UploadFontForm onSuccess={handleAdded} onCancel={() => setAddMode(null)} />
      )}

      {/* Font list */}
      {allFonts.length === 0
        ? (
            <p className="muted" data-testid="font-selector-empty" style={{ fontSize: 12 }}>
              No fonts available. Add a Google Font or upload one above.
            </p>
          )
        : filtered.length === 0
          ? (
              <p className="muted" data-testid="font-selector-no-match" style={{ fontSize: 12 }}>
                No fonts match "
                {search}
                ".
              </p>
            )
          : (
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
                data-testid="font-selector-list"
              >
                {filtered.map((font) => {
                  const selected = selectedFontIds.includes(font.id)
                  return (
                    <button
                      key={font.id}
                      onClick={() => toggle(font.id)}
                      data-testid={`font-toggle-${font.id}`}
                      style={{
                        background: selected ? 'rgba(59,130,246,0.15)' : 'var(--bg-tertiary)',
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        color: selected ? '#60a5fa' : 'var(--text)',
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      {font.family}
                      {' '}
                      {font.weight}
                      {font.style !== 'normal' ? ` ${font.style}` : ''}
                      {font.source === 'google' && (
                        <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>G</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
    </div>
  )
}

// ─── Inline Google Fonts form ─────────────────────────────────────────────────

function GoogleFontForm({
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
    const variants = variantsRaw.split(',').map(v => v.trim()).filter(Boolean)
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
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      data-testid="font-selector-google-form"
    >
      <div style={{ fontWeight: 600, fontSize: 12 }}>Add Google Font</div>
      {error && <p className="error-text" style={{ fontSize: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={family}
          onChange={e => setFamily(e.target.value)}
          placeholder="Family (e.g. Inter)"
          required
          data-testid="font-selector-google-family"
          style={{ flex: 1, fontSize: 12, padding: '3px 8px' }}
        />
        <input
          value={variantsRaw}
          onChange={e => setVariantsRaw(e.target.value)}
          placeholder="400,700,400italic"
          data-testid="font-selector-google-variants"
          style={{ flex: 1, fontSize: 12, padding: '3px 8px' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !family.trim()}
          data-testid="font-selector-google-submit"
          style={{ fontSize: 12, padding: '3px 10px' }}
        >
          {loading ? 'Fetching…' : 'Add'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          style={{ fontSize: 12, padding: '3px 10px' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Inline upload form ───────────────────────────────────────────────────────

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
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      data-testid="font-selector-upload-form"
    >
      <div style={{ fontWeight: 600, fontSize: 12 }}>Upload Font</div>
      {error && <p className="error-text" style={{ fontSize: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input
          value={family}
          onChange={e => setFamily(e.target.value)}
          placeholder="Family (e.g. Inter)"
          required
          data-testid="font-selector-upload-family"
          style={{ flex: 1, minWidth: 100, fontSize: 12, padding: '3px 8px' }}
        />
        <select
          value={weight}
          onChange={e => setWeight(Number(e.target.value))}
          data-testid="font-selector-upload-weight"
          style={{ fontSize: 12 }}
        >
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
        <select
          value={style}
          onChange={e => setStyle(e.target.value as 'normal' | 'italic')}
          data-testid="font-selector-upload-style"
          style={{ fontSize: 12 }}
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
        data-testid="font-selector-upload-file"
        style={{ padding: 0, border: 'none', background: 'none', color: 'var(--text)', fontSize: 12 }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={uploading || !file || !family.trim()}
          data-testid="font-selector-upload-submit"
          style={{ fontSize: 12, padding: '3px 10px' }}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          style={{ fontSize: 12, padding: '3px 10px' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
