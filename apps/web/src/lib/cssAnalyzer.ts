/**
 * Client-side CSS analyzer for the OG editor.
 *
 * Scans the user's CSS config for:
 *   - Properties that Satori does not support (warnings)
 *   - Values that are known to be unsupported (e.g. `display: grid`)
 *
 * This runs entirely in the browser — no API call needed.
 */

export interface CssDiagnostic {
  type: 'warning'
  message: string
  /** The CSS selector context, e.g. ".my-class" */
  selector?: string
  /** The full declaration that triggered this, e.g. "display: grid" */
  declaration?: string
}

// ─── Satori-supported property set ────────────────────────────────────────────
// Derived from https://github.com/vercel/satori#css

const SUPPORTED_PROPERTIES = new Set([
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'flex',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'align-items',
  'align-content',
  'align-self',
  'justify-content',
  'gap',
  'row-gap',
  'column-gap',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'color',
  'opacity',
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'background-clip',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'text-transform',
  'text-overflow',
  'text-shadow',
  'white-space',
  'word-break',
  '-webkit-text-stroke',
  '-webkit-text-stroke-width',
  '-webkit-text-stroke-color',
  'overflow',
  'object-fit',
  'object-position',
  'box-shadow',
  'filter',
  'transform',
  'transform-origin',
  'clip-path',
  // Custom properties are always allowed
])

// Values that are unsupported for specific properties
const UNSUPPORTED_VALUES: Record<string, { values: string[], hint: string }> = {
  'display': {
    values: ['grid', 'inline-grid', 'block', 'inline', 'inline-block', 'table', 'table-cell', 'table-row'],
    hint: 'Satori only supports display: flex and display: none',
  },
  'position': {
    values: ['fixed', 'sticky'],
    hint: 'Satori only supports position: relative, absolute, and static',
  },
  'border-style': {
    values: ['dotted', 'double', 'groove', 'ridge', 'inset', 'outset'],
    hint: 'Satori only supports border-style: solid and dashed',
  },
}

// Properties that are completely unsupported in Satori
const KNOWN_UNSUPPORTED = new Set([
  'grid',
  'grid-template',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',
  'grid-area',
  'grid-auto-flow',
  'grid-auto-columns',
  'grid-auto-rows',
  'float',
  'clear',
  'visibility',
  'z-index',
  'cursor',
  'pointer-events',
  'user-select',
  'animation',
  'transition',
  'content',
  'list-style',
  'list-style-type',
  'list-style-image',
  'table-layout',
  'border-collapse',
  'border-spacing',
  'vertical-align',
  'box-sizing',
  'outline',
  'resize',
  'appearance',
])

// ─── Parser ───────────────────────────────────────────────────────────────────

const SPACE_REGEX = /\s/
const MULTI_SPACE_REGEX = /\s+/

/**
 * Very lightweight CSS parser: extracts selector + declaration blocks.
 * Handles nested braces (e.g. @layer, @media) by skipping them.
 * Only looks at plain `.classname { ... }` rules.
 */
function parseRules(css: string): Array<{ selector: string, declarations: string }> {
  const rules: Array<{ selector: string, declarations: string }> = []
  const len = css.length
  let i = 0

  while (i < len) {
    // Skip whitespace
    while (i < len && SPACE_REGEX.test(css[i])) i++
    if (i >= len)
      break

    // Skip comments
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? len : end + 2
      continue
    }

    // Skip @-rules entirely (including their blocks)
    if (css[i] === '@') {
      const braceIdx = css.indexOf('{', i)
      if (braceIdx === -1)
        break
      // Find matching closing brace
      let depth = 0
      let j = braceIdx
      while (j < len) {
        if (css[j] === '{') {
          depth++
        }
        else if (css[j] === '}') {
          depth--
          if (depth === 0) {
            j++
            break
          }
        }
        j++
      }
      i = j
      continue
    }

    // Read selector (everything up to '{')
    const braceIdx = css.indexOf('{', i)
    if (braceIdx === -1)
      break

    const selector = css.slice(i, braceIdx).trim()

    // Find matching closing brace (depth-aware)
    let depth = 0
    let j = braceIdx
    while (j < len) {
      if (css[j] === '{') {
        depth++
      }
      else if (css[j] === '}') {
        depth--
        if (depth === 0) {
          j++
          break
        }
      }
      j++
    }

    const body = css.slice(braceIdx + 1, j - 1)
    rules.push({ selector, declarations: body })
    i = j
  }

  return rules
}

const IMPORT_REGEX = /@import\s[^;]+;/g
const CLASS_NAME_REGEX = /^\.[a-z][\w-]*$/i

/**
 * Analyse a CSS config string and return an array of diagnostics.
 */
export function analyzeCss(cssConfig: string): CssDiagnostic[] {
  if (!cssConfig.trim())
    return []

  const diagnostics: CssDiagnostic[] = []

  // Strip @import lines before parsing (they're not rules)
  const css = cssConfig.replace(IMPORT_REGEX, '')

  const rules = parseRules(css)

  for (const { selector, declarations } of rules) {
    // Only analyze simple class selectors; skip pseudo-classes, combinators etc.
    const isSimpleClass = CLASS_NAME_REGEX.test(selector)

    const parts = declarations.split(';')
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed)
        continue

      const colonIdx = trimmed.indexOf(':')
      if (colonIdx === -1)
        continue

      const prop = trimmed.slice(0, colonIdx).trim().toLowerCase()
      const value = trimmed.slice(colonIdx + 1).trim()

      if (!prop)
        continue
      // Custom properties are fine
      if (prop.startsWith('--'))
        continue

      const context = isSimpleClass ? selector : undefined

      // Check for completely unsupported properties
      if (KNOWN_UNSUPPORTED.has(prop)) {
        diagnostics.push({
          type: 'warning',
          message: `"${prop}" is not supported by Satori and will be ignored`,
          selector: context,
          declaration: `${prop}: ${value}`,
        })
        continue
      }

      // Check for unknown properties (not in supported set, not vendor-prefixed)
      if (!SUPPORTED_PROPERTIES.has(prop) && !prop.startsWith('-webkit-') && !prop.startsWith('-moz-')) {
        diagnostics.push({
          type: 'warning',
          message: `"${prop}" may not be supported by Satori`,
          selector: context,
          declaration: `${prop}: ${value}`,
        })
        continue
      }

      // Check for unsupported values on specific properties
      const valueRule = UNSUPPORTED_VALUES[prop]
      if (valueRule) {
        const normalizedValue = value.split(MULTI_SPACE_REGEX)[0].toLowerCase()
        if (valueRule.values.includes(normalizedValue)) {
          diagnostics.push({
            type: 'warning',
            message: `"${prop}: ${normalizedValue}" — ${valueRule.hint}`,
            selector: context,
            declaration: `${prop}: ${value}`,
          })
        }
      }
    }
  }

  return diagnostics
}
