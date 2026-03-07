import type { Font, OGVariable, TemplateWithFonts } from '@og/shared'
import type { RenderError } from '../components/editor/DiagnosticsPanel'
import type { CssDiagnostic } from '../lib/cssAnalyzer'
import { ArrowLeft, Bug, Code, Copy, Eye, Palette, Save, Settings, Stethoscope, Type, Variable } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CssConfigEditor } from '../components/editor/CssConfigEditor'
import { DiagnosticsBadge, DiagnosticsPanel } from '../components/editor/DiagnosticsPanel'
import { EditorSettingsPanel } from '../components/editor/EditorSettingsPanel'
import { FontSelector } from '../components/editor/FontSelector'
import { TemplateEditor } from '../components/editor/TemplateEditor'
import { VariableForm } from '../components/editor/VariableForm'
import { OG_ASPECT, OG_HEIGHT, OG_WIDTH, Preview } from '../components/preview/Preview'
import { TabBar, TagInput } from '../components/ui'
import { useEditorSettings } from '../hooks/useEditorSettings'
import { useResizableSplit } from '../hooks/useResizableSplit'
import { useToast } from '../hooks/useToast'
import { ApiError, assetsApi, fontsApi, previewApi, templatesApi } from '../lib/api'
import { analyzeCss } from '../lib/cssAnalyzer'
import { mergeVariables, parsePropsInterface, patchPropsInCode } from '../lib/parseProps'
import { buildApiUrl, buildPreviewVars } from '../lib/url'

const PREVIEW_DEBOUNCE_MS = 300

export function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [template, setTemplate] = useState<TemplateWithFonts | null>(null)
  const [code, setCode] = useState('')
  const [cssConfig, setCssConfig] = useState('')
  const [variables, setVariables] = useState<OGVariable[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [selectedFontIds, setSelectedFontIds] = useState<string[]>([])
  const [allFonts, setAllFonts] = useState<Font[]>([])
  const [galleryIdentifiers, setGalleryIdentifiers] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [debugUrl, setDebugUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [renamingName, setRenamingName] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<'code' | 'css'>('code')
  const [bottomTab, setBottomTab] = useState<'variables' | 'fonts' | 'diagnostics'>('variables')
  const [rightTab, setRightTab] = useState<'preview' | 'debug'>('preview')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [renderError, setRenderError] = useState<RenderError | null>(null)
  const [cssWarnings, setCssWarnings] = useState<CssDiagnostic[]>([])

  const { settings, update: updateSetting } = useEditorSettings()
  const { rightPct, containerRef, onMouseDown } = useResizableSplit()
  const { toast } = useToast()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPreviewUrlRef = useRef<string | null>(null)
  const prevDebugUrlRef = useRef<string | null>(null)
  // When true, the next code-change event was caused by us patching the Props
  // interface from the variable form — skip the reverse sync to avoid a loop.
  const suppressSyncRef = useRef(false)
  // Track whether the current variables state was set by the user (via VariableForm)
  // vs automatically synced from the Props interface
  const variablesRef = useRef<OGVariable[]>([])
  variablesRef.current = variables

  // Load template and fonts; auto-select the first available font when
  // the template has none saved yet.
  useEffect(() => {
    if (!id)
      return
    Promise.all([templatesApi.get(id), fontsApi.list(), assetsApi.list()]).then(([t, fonts, assets]) => {
      setTemplate(t)
      setCode(t.code)
      setCssConfig(t.cssConfig ?? '')
      setVariables(t.variableSchema)
      setTags(t.tags ?? [])
      setAllFonts(fonts as Font[])
      setGalleryIdentifiers(assets.map(a => a.identifier))

      const savedFontIds = t.fonts.map(f => f.id)
      if (savedFontIds.length > 0) {
        setSelectedFontIds(savedFontIds)
      }
      else if ((fonts as Font[]).length > 0) {
        // No fonts saved on template — default to the first available font
        setSelectedFontIds([(fonts as Font[])[0].id])
      }
    })
  }, [id])

  // Sync variables from Props interface whenever the code changes.
  // We parse the `Props` interface and merge it with the current variable list
  // so that defaults and ordering set by the user are preserved.
  const syncPropsToVariables = useCallback((newCode: string) => {
    const { variables: parsed } = parsePropsInterface(newCode)
    // Only sync if the Props interface actually defines something (or was cleared)
    setVariables(prev => mergeVariables(parsed, prev))
  }, [])

  function handleCodeChange(newCode: string) {
    setCode(newCode)
    if (suppressSyncRef.current) {
      suppressSyncRef.current = false
      return
    }
    syncPropsToVariables(newCode)
  }

  // Called by VariableForm — update variables AND patch the Props interface in code.
  function handleVariablesChange(newVars: OGVariable[]) {
    setVariables(newVars)
    setCode((prevCode) => {
      const patched = patchPropsInCode(prevCode, newVars)
      if (patched !== prevCode)
        suppressSyncRef.current = true
      return patched
    })
  }

  // Trigger debounced preview
  const triggerPreview = useCallback(
    (currentCode: string, currentCss: string, currentVars: OGVariable[], fontIds: string[]) => {
      if (debounceRef.current)
        clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(async () => {
        if (!currentCode.trim())
          return
        setPreviewLoading(true)
        setPreviewError(null)

        const input = {
          code: currentCode,
          cssConfig: currentCss,
          variables: buildPreviewVars(currentVars),
          variableSchema: currentVars,
          fontIds,
        }

        try {
          const [url, dUrl] = await Promise.all([
            previewApi.render(input),
            previewApi.debug(input),
          ])
          // Revoke previous object URLs to avoid memory leaks
          if (prevPreviewUrlRef.current)
            URL.revokeObjectURL(prevPreviewUrlRef.current)
          if (prevDebugUrlRef.current)
            URL.revokeObjectURL(prevDebugUrlRef.current)
          prevPreviewUrlRef.current = url
          prevDebugUrlRef.current = dUrl
          setPreviewUrl(url)
          setDebugUrl(dUrl)
          setRenderError(null)
        }
        catch (err) {
          const message = err instanceof Error ? err.message : 'Preview failed'
          const details = err instanceof ApiError ? err.details : undefined
          setPreviewError(message)
          setRenderError({ message, details })
        }
        finally {
          setPreviewLoading(false)
        }
      }, PREVIEW_DEBOUNCE_MS)
    },
    [],
  )

  // Analyse CSS config for Satori compatibility warnings
  useEffect(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setCssWarnings(analyzeCss(cssConfig))
  }, [cssConfig])

  // Re-render preview when code, CSS config, variables, or fonts change
  useEffect(() => {
    if (template)
      triggerPreview(code, cssConfig, variables, selectedFontIds)
  }, [code, cssConfig, variables, selectedFontIds, template, triggerPreview])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current)
        clearTimeout(debounceRef.current)
      if (prevPreviewUrlRef.current)
        URL.revokeObjectURL(prevPreviewUrlRef.current)
      if (prevDebugUrlRef.current)
        URL.revokeObjectURL(prevDebugUrlRef.current)
    }
  }, [])

  async function handleSave(currentCode?: string) {
    if (!id)
      return
    try {
      setSaving(true)
      const updated = await templatesApi.update(id, {
        code: currentCode ?? code,
        cssConfig,
        variableSchema: variables,
        tags,
        fontIds: selectedFontIds,
      })
      setTemplate(updated)
      toast('Template saved', 'success')
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      toast(message, 'error')
    }
    finally {
      setSaving(false)
    }
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(buildApiUrl(template?.id ?? null, variables))
    toast('API URL copied to clipboard', 'info')
  }

  async function handleRenameCommit() {
    if (!id || renamingName === null)
      return
    const trimmed = renamingName.trim()
    if (!trimmed || trimmed === template?.name) {
      setRenamingName(null)
      return
    }
    try {
      const updated = await templatesApi.update(id, { name: trimmed })
      setTemplate(updated)
      setRenamingName(null)
      toast(`Renamed to "${trimmed}"`, 'success')
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Rename failed'
      toast(message, 'error')
    }
  }

  /** Called when fonts are added from the FontSelector's inline forms. */
  function handleFontsAdded(newFonts: Font[]) {
    setAllFonts((prev) => {
      const existing = new Set(prev.map(f => f.id))
      return [...prev, ...newFonts.filter(f => !existing.has(f.id))]
    })
    // Auto-select newly added fonts
    setSelectedFontIds((prev) => {
      const existing = new Set(prev)
      const toAdd = newFonts.filter(f => !existing.has(f.id)).map(f => f.id)
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
  }

  if (!template) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span className="muted">Loading editor…</span>
      </div>
    )
  }

  const selectedFonts = allFonts.filter(f => selectedFontIds.includes(f.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          height: 48,
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button
            className="btn-secondary"
            onClick={() => navigate('/dashboard')}
            style={{ fontSize: 13, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            data-testid="back-btn"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          {renamingName !== null
            ? (
                <input
                  data-testid="rename-input"
                  value={renamingName}
                  onChange={e => setRenamingName(e.target.value)}
                  onBlur={handleRenameCommit}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter')
                      await handleRenameCommit()
                    if (e.key === 'Escape') {
                      setRenamingName(null)
                    }
                  }}
                  style={{
                    fontWeight: 600,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--accent)',
                    borderRadius: 'var(--radius)',
                    padding: '2px 6px',
                    fontSize: 14,
                    color: 'var(--text)',
                  }}
                  autoFocus
                />
              )
            : (
                <span
                  data-testid="template-name"
                  style={{ fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                  title="Click to rename"
                  onClick={() => setRenamingName(template.name)}
                >
                  {template.name}
                </span>
              )}

          {/* Tag chips */}
          <div style={{ flex: 1, minWidth: 0, maxWidth: 400 }}>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="+ tag"
              inline
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={handleCopyUrl}
            style={{ fontSize: 13, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            data-testid="copy-url-btn"
          >
            <Copy size={13} />
            Copy API URL
          </button>
          <button
            className="btn-secondary"
            onClick={() => setSettingsOpen(v => !v)}
            style={{ fontSize: 13, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            data-testid="editor-settings-btn"
            aria-label="Editor settings"
          >
            <Settings size={13} />
            Settings
          </button>
          {settingsOpen && (
            <EditorSettingsPanel
              settings={settings}
              onUpdate={updateSetting}
              onClose={() => setSettingsOpen(false)}
            />
          )}
          <button
            className="btn-primary"
            onClick={() => handleSave()}
            disabled={saving}
            data-testid="save-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main split: editor | preview */}
      <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Left tab bar: Code / CSS Config */}
          <div style={{ background: 'var(--bg-secondary)', flexShrink: 0 }}>
            <TabBar
              tabs={[
                {
                  value: 'code',
                  label: (
                    <>
                      <Code size={13} style={{ marginRight: 5 }} />
                      Template
                    </>
                  ),
                },
                { value: 'css', label:
                    (
                      <>
                        <Palette size={13} style={{ marginRight: 5 }} />
                        CSS Config
                      </>
                    ) },
              ]}
              active={leftTab}
              onChange={setLeftTab}
              size="sm"
            />
          </div>

          {/* Editor area */}
          <div style={{ flex: 1, overflow: 'hidden', display: leftTab === 'code' ? 'flex' : 'none', flexDirection: 'column' }}>
            <TemplateEditor
              value={code}
              onChange={handleCodeChange}
              fontFamilies={[...new Set(selectedFonts.map(f => f.family))]}
              galleryIdentifiers={galleryIdentifiers}
              onSave={handleSave}
              formatOnSave={settings.formatOnSave}
              editorSettings={settings}
            />
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: leftTab === 'css' ? 'flex' : 'none', flexDirection: 'column' }}>
            <CssConfigEditor
              value={cssConfig}
              onChange={setCssConfig}
              fontFamilies={[...new Set(allFonts.map(f => f.family))]}
              editorSettings={settings}
            />
          </div>
        </div>

        {/* Drag handle */}
        <div
          data-testid="split-handle"
          onMouseDown={onMouseDown}
          style={{
            width: 5,
            cursor: 'col-resize',
            background: 'transparent',
            borderLeft: '1px solid var(--border)',
            flexShrink: 0,
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--accent)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        />

        {/* Right: preview / debug */}
        <div
          style={{
            width: `${rightPct}%`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Right tab bar */}
          <div style={{ background: 'var(--bg-secondary)', flexShrink: 0 }}>
            <TabBar
              tabs={[
                { value: 'preview', label: (
                  <>
                    <Eye size={13} style={{ marginRight: 5 }} />
                    Preview
                  </>
                ) },
                { value: 'debug', label: (
                  <>
                    <Bug size={13} style={{ marginRight: 5 }} />
                    Debug
                  </>
                ) },
              ]}
              active={rightTab}
              onChange={setRightTab}
              size="sm"
            />
          </div>

          {/* Preview tab */}
          <div style={{ overflow: 'hidden', padding: 16, display: rightTab === 'preview' ? 'flex' : 'none', flexDirection: 'column' }}>
            <Preview url={previewUrl} loading={previewLoading} error={previewError} />
          </div>

          {/* Debug tab */}
          <div style={{ overflow: 'hidden', display: rightTab === 'debug' ? 'flex' : 'none', flexDirection: 'column' }}>
            {previewError
              ? (
                  <div style={{ padding: 16 }}>
                    <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>Preview Error</div>
                    <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {previewError}
                    </pre>
                  </div>
                )
              : debugUrl
                ? (
                    <iframe
                      key={debugUrl}
                      src={debugUrl}
                      style={{ flex: 1, border: 'none', width: '100%', maxWidth: `min(100%, calc(100vh * ${OG_ASPECT.toFixed(4)}))`, aspectRatio: `${OG_WIDTH} / ${OG_HEIGHT}` }}
                      title="OG Debug"
                      data-testid="debug-iframe"
                    />
                  )
                : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="muted">{previewLoading ? 'Rendering…' : 'Preview will appear here'}</span>
                    </div>
                  )}
          </div>

          {/* Bottom panel: Variables / Fonts */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <TabBar
                tabs={[
                  { value: 'variables', label: (
                    <>
                      <Variable size={13} style={{ marginRight: 5 }} />
                      Variables
                    </>
                  ) },
                  { value: 'fonts', label: (
                    <>
                      <Type size={13} style={{ marginRight: 5 }} />
                      Fonts
                    </>
                  ) },
                  {
                    value: 'diagnostics',
                    label: (
                      <>
                        <Stethoscope size={13} style={{ marginRight: 5 }} />
                        Diagnostics
                        <DiagnosticsBadge
                          error={!!renderError}
                          warningCount={cssWarnings.length}
                        />
                      </>
                    ),
                  },
                ]}
                active={bottomTab}
                onChange={setBottomTab}
                size="sm"
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {bottomTab === 'variables'
                ? (
                    <VariableForm variables={variables} onChange={handleVariablesChange} />
                  )
                : bottomTab === 'fonts'
                  ? (
                      <FontSelector
                        allFonts={allFonts}
                        selectedFontIds={selectedFontIds}
                        onChange={setSelectedFontIds}
                        onFontsAdded={handleFontsAdded}
                      />
                    )
                  : (
                      <DiagnosticsPanel error={renderError} warnings={cssWarnings} />
                    )}
            </div>
          </div>

          {/* API URL bar */}
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}
          >
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>API URL</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text)',
                wordBreak: 'break-all',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius)',
                padding: '4px 8px',
              }}
              data-testid="api-url-display"
            >
              {buildApiUrl(template.id, variables)}
            </div>
            {selectedFontIds.length === 0 && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: 'var(--danger)',
                }}
                data-testid="font-warning"
              >
                {allFonts.length === 0
                  ? 'No fonts configured — text may not render. Add fonts on the Dashboard.'
                  : 'No font selected — text may not render. Select a font in the Fonts tab.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
