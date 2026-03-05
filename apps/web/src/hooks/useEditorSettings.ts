import { useCallback, useState } from 'react'

const STORAGE_KEY = 'og:editor-settings'

export interface EditorSettings {
  wordWrap: 'on' | 'off'
  fontSize: number
  lineNumbers: 'on' | 'off'
  minimap: boolean
  formatOnPaste: boolean
  formatOnSave: boolean
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all'
  tabSize: 2 | 4
}

export const EDITOR_SETTINGS_DEFAULT: EditorSettings = {
  wordWrap: 'on',
  fontSize: 14,
  lineNumbers: 'on',
  minimap: false,
  formatOnPaste: true,
  formatOnSave: true,
  renderWhitespace: 'selection',
  tabSize: 2,
}

function load(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return EDITOR_SETTINGS_DEFAULT
    return { ...EDITOR_SETTINGS_DEFAULT, ...JSON.parse(raw) }
  }
  catch {
    return EDITOR_SETTINGS_DEFAULT
  }
}

function save(s: EditorSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  }
  catch {
    // ignore
  }
}

export function useEditorSettings() {
  const [settings, setSettings] = useState<EditorSettings>(load)

  const update = useCallback(<K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      save(next)
      return next
    })
  }, [])

  return { settings, update }
}
