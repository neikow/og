import type * as Monaco from 'monaco-editor'
import type { EditorSettings } from '../../hooks/useEditorSettings'
import MonacoEditor, { useMonaco } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'
import { configureMonaco, EDITOR_DEFAULT_OPTIONS } from '../../lib/monaco'

interface TemplateEditorProps {
  value: string
  onChange: (value: string) => void
  fontFamilies?: string[]
  galleryIdentifiers?: string[]
  /** Called when the user saves with Cmd+S / Ctrl+S, with the current (formatted) code */
  onSave?: (currentCode: string) => void
  /** Whether to format the document before saving (default: true) */
  formatOnSave?: boolean
  editorSettings?: Partial<EditorSettings>
}

export function TemplateEditor({
  value,
  onChange,
  fontFamilies = [],
  galleryIdentifiers = [],
  onSave,
  formatOnSave = true,
  editorSettings,
}: TemplateEditorProps) {
  const monaco = useMonaco()
  const configuredRef = useRef(false)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  // Always hold the latest onSave so the addCommand closure never goes stale
  const onSaveRef = useRef(onSave)
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!monaco || configuredRef.current)
      return
    configuredRef.current = true
    configureMonaco(monaco, fontFamilies, galleryIdentifiers)
  }, [fontFamilies, galleryIdentifiers, monaco])

  // Update font family and gallery completions when they change
  useEffect(() => {
    if (!monaco || !configuredRef.current)
      return
    configureMonaco(monaco, fontFamilies, galleryIdentifiers)
  }, [fontFamilies, galleryIdentifiers, monaco])

  function handleEditorDidMount(editor: Monaco.editor.IStandaloneCodeEditor) {
    editorRef.current = editor

    // Register Cmd+S / Ctrl+S save action
    editor.addCommand(
      monaco!.KeyMod.CtrlCmd | monaco!.KeyCode.KeyS,
      async () => {
        if (formatOnSave) {
          await editor.getAction('editor.action.formatDocument')?.run()
        }
        // Read directly from the model so we get the post-format value,
        // bypassing any React state lag
        const currentCode = editor.getModel()?.getValue() ?? ''
        onSaveRef.current?.(currentCode)
      },
    )
  }

  const options = {
    ...EDITOR_DEFAULT_OPTIONS,
    ...(editorSettings?.wordWrap !== undefined && { wordWrap: editorSettings.wordWrap }),
    ...(editorSettings?.fontSize !== undefined && { fontSize: editorSettings.fontSize }),
    ...(editorSettings?.lineNumbers !== undefined && { lineNumbers: editorSettings.lineNumbers }),
    ...(editorSettings?.minimap !== undefined && { minimap: { enabled: editorSettings.minimap } }),
    ...(editorSettings?.formatOnPaste !== undefined && { formatOnPaste: editorSettings.formatOnPaste }),
    ...(editorSettings?.renderWhitespace !== undefined && { renderWhitespace: editorSettings.renderWhitespace }),
    ...(editorSettings?.tabSize !== undefined && { tabSize: editorSettings.tabSize }),
  }

  return (
    <MonacoEditor
      height="100%"
      language="typescript"
      path="template.tsx"
      value={value}
      onChange={val => onChange(val ?? '')}
      options={options}
      onMount={handleEditorDidMount}
      data-testid="template-editor"
    />
  )
}
