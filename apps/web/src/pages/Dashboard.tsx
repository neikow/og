import type { Template } from '@og/shared'
import { Copy, Image, Key, LayoutTemplate, LogOut, Pencil, Plus, Tag, Trash2, Type } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiKeyManager } from '../components/api-keys/ApiKeyManager'
import { GalleryManager } from '../components/assets/GalleryManager'
import { FontManager } from '../components/fonts/FontManager'
import { EmptyState, ListCard, SectionHeader, TabBar } from '../components/ui'
import { useToast } from '../hooks/useToast'
import { auth, templatesApi } from '../lib/api'

type Tab = 'templates' | 'api-keys' | 'fonts' | 'gallery'
type SortOption = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc'

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('templates')
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('updated-desc')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (tab === 'templates')
      loadTemplates()
  }, [tab])

  // Clear selection when templates reload
  useEffect(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setSelected(new Set())
  }, [templates])

  async function loadTemplates() {
    try {
      setLoading(true)
      setError(null)
      const data = await templatesApi.list()
      setTemplates(data)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    }
    finally {
      setLoading(false)
    }
  }

  // Collect all unique tags across loaded templates
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const t of templates) {
      for (const tag of t.tags ?? []) set.add(tag)
    }
    return [...set].toSorted()
  }, [templates])

  // Filter + sort
  const visibleTemplates = useMemo(() => {
    let list = activeTag
      ? templates.filter(t => (t.tags ?? []).includes(activeTag))
      : templates

    list = list.toSorted((a, b) => {
      if (sort === 'name-asc')
        return a.name.localeCompare(b.name)
      if (sort === 'name-desc')
        return b.name.localeCompare(a.name)
      if (sort === 'updated-asc')
        return a.updatedAt.localeCompare(b.updatedAt)
      // updated-desc (default)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return list
  }, [templates, activeTag, sort])

  async function handleCreate() {
    try {
      setCreating(true)
      const template = await templatesApi.create({
        name: 'Untitled Template',
        code: '',
        variableSchema: [],
        tags: [],
        fontIds: [],
      })
      navigate(`/templates/${template.id}`)
    }
    catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create template', 'error')
    }
    finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`))
      return
    try {
      await templatesApi.delete(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast(`Template "${name}" deleted`)
    }
    catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete template', 'error')
    }
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} template${count > 1 ? 's' : ''}? This cannot be undone.`))
      return
    try {
      setBulkDeleting(true)
      await Promise.all(Array.from(selected, id => templatesApi.delete(id)))
      setTemplates(prev => prev.filter(t => !selected.has(t.id)))
      toast(`Deleted ${count} template${count > 1 ? 's' : ''}`, 'success')
    }
    catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk delete failed', 'error')
    }
    finally {
      setBulkDeleting(false)
    }
  }

  async function handleLogout() {
    await auth.logout()
    navigate('/login')
  }

  async function handleCopyUrl(id: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/og/${id}`)
    toast('API URL copied to clipboard', 'info')
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id))
        next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === visibleTemplates.length) {
      setSelected(new Set())
    }
    else {
      setSelected(new Set(visibleTemplates.map(t => t.id)))
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/favicon.svg" alt="Logo" style={{ width: 48, height: 48, marginRight: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Og</h1>
        </div>
        <button className="btn-secondary" onClick={handleLogout} data-testid="logout-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 24 }}>
        <TabBar<Tab>
          tabs={[
            { value: 'templates', label: (
              <>
                <LayoutTemplate size={14} style={{ marginRight: 6 }} />
                Templates
              </>
            ) },
            { value: 'api-keys', label: (
              <>
                <Key size={14} style={{ marginRight: 6 }} />
                API Keys
              </>
            ) },
            { value: 'fonts', label: (
              <>
                <Type size={14} style={{ marginRight: 6 }} />
                Fonts
              </>
            ) },
            { value: 'gallery', label: (
              <>
                <Image size={14} style={{ marginRight: 6 }} />
                Gallery
              </>
            ) },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* Tab content */}
      {tab === 'templates' && (
        <div>
          <SectionHeader title="Templates">
            {selected.size > 0 && (
              <button
                className="btn-danger"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                data-testid="bulk-delete-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={14} />
                {bulkDeleting ? 'Deleting…' : `Delete ${selected.size}`}
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleCreate}
              disabled={creating}
              data-testid="create-template-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} />
              {creating ? 'Creating…' : 'New Template'}
            </button>
          </SectionHeader>

          {/* Tag filter bar */}
          {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' }}>
              <Tag size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <button
                onClick={() => setActiveTag(null)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '2px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: activeTag === null ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: activeTag === null ? '#fff' : 'var(--text)',
                }}
                data-testid="tag-filter-all"
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    padding: '2px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                    background: activeTag === tag ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: activeTag === tag ? '#fff' : 'var(--text)',
                  }}
                  data-testid={`tag-filter-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Sort + select-all row */}
          {!loading && visibleTemplates.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === visibleTemplates.length}
                ref={(el) => {
                  if (el)
                    el.indeterminate = selected.size > 0 && selected.size < visibleTemplates.length
                }}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer' }}
                aria-label="Select all"
                data-testid="select-all-checkbox"
              />
              <span className="muted" style={{ fontSize: 12, flex: 1 }}>
                {selected.size > 0 ? `${selected.size} selected` : `${visibleTemplates.length} template${visibleTemplates.length !== 1 ? 's' : ''}`}
              </span>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortOption)}
                style={{
                  fontSize: 12,
                  padding: '3px 6px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
                data-testid="sort-select"
              >
                <option value="updated-desc">Newest first</option>
                <option value="updated-asc">Oldest first</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
              </select>
            </div>
          )}

          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

          {
            loading
              ? (
                  <p className="muted" data-testid="templates-loading">Loading templates…</p>
                )
              : visibleTemplates.length === 0
                ? (
                    <EmptyState testId="templates-empty">
                      <p className="muted">{activeTag ? `No templates tagged "${activeTag}".` : 'No templates yet.'}</p>
                      {!activeTag && (
                        <p className="muted" style={{ marginTop: 4 }}>Create your first template to get started.</p>
                      )}
                    </EmptyState>
                  )
                : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="templates-list">
                      {visibleTemplates.map(template => (
                        <ListCard key={template.id} testId={`template-item-${template.id}`}>
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={selected.has(template.id)}
                            onChange={() => toggleSelect(template.id)}
                            style={{ cursor: 'pointer', flexShrink: 0, marginRight: 8 }}
                            aria-label={`Select ${template.name}`}
                            data-testid={`select-template-${template.id}`}
                          />

                          {/* Preview thumbnail */}
                          <div
                            style={{
                              width: 120,
                              height: 63,
                              flexShrink: 0,
                              background: 'var(--bg-tertiary)',
                              borderRadius: 4,
                              overflow: 'hidden',
                              marginRight: 14,
                            }}
                          >
                            <img
                              src={`/templates/${template.id}/preview`}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, marginBottom: 2 }}>{template.name}</div>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                color: 'var(--text-muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {template.id}
                            </div>
                            {(template.tags ?? []).length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                {(template.tags ?? []).map(tag => (
                                  <button
                                    key={tag}
                                    className="badge badge-blue"
                                    style={{ cursor: 'pointer', border: 'none', fontSize: 11 }}
                                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                    data-testid={`template-tag-${template.id}-${tag}`}
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                            <button
                              className="btn-secondary"
                              onClick={() => handleCopyUrl(template.id)}
                              data-testid={`copy-url-${template.id}`}
                              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                              <Copy size={13} />
                              Copy URL
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => navigate(`/templates/${template.id}`)}
                              data-testid={`edit-template-${template.id}`}
                              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                              <Pencil size={13} />
                              Edit
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => handleDelete(template.id, template.name)}
                              data-testid={`delete-template-${template.id}`}
                              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </ListCard>
                      ))}
                    </div>
                  )
          }
        </div>
      )}

      {tab === 'api-keys' && <ApiKeyManager />}
      {tab === 'fonts' && <FontManager />}
      {tab === 'gallery' && <GalleryManager />}
    </div>
  )
}
