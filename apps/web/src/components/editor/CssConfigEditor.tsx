import type { EditorSettings } from '../../hooks/useEditorSettings'
import MonacoEditor from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useEffect } from 'react'
import { configureCssEditor, EDITOR_DEFAULT_OPTIONS } from '../../lib/monaco'

interface CssConfigEditorProps {
  value: string
  onChange: (value: string) => void
  fontFamilies?: string[]
  editorSettings?: Partial<EditorSettings>
}

export function CssConfigEditor({ value, onChange, fontFamilies = [], editorSettings }: CssConfigEditorProps) {
  useEffect(() => {
    configureCssEditor(monaco, fontFamilies)
  }, [fontFamilies])

  const options = {
    ...EDITOR_DEFAULT_OPTIONS,
    'semanticHighlighting.enabled': true,
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
      language="css"
      path="tailwind.css"
      value={value}
      onChange={val => onChange(val ?? '')}
      options={options}
    />
  )
}
