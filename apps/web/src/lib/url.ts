import type { OGVariable } from '@og/shared'

export function buildPreviewVars(schema: OGVariable[]) {
  const vars: Record<string, string> = {}
  for (const v of schema) {
    vars[v.name] = v.default ?? (v.type === 'number' ? '0' : v.type === 'boolean' ? 'false' : 'Hello')
  }
  return vars
}

export function buildApiUrl(templateId: string | null, variables: OGVariable[]) {
  if (!templateId)
    return ''
  const base = `/og/${templateId}`
  const defaults = buildPreviewVars(variables)
  const params = new URLSearchParams(defaults)
  return `${window.location.origin}${base}?${params.toString()}`
}
