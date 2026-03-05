import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join } from 'node:path'
import { compile } from 'tailwindcss'

const _require = createRequire(import.meta.url)
const twBase = dirname(_require.resolve('tailwindcss/package.json'))

export type ClassStyleMap = Map<string, React.CSSProperties>

// ─── Module-level static regexes ──────────────────────────────────────────────

/** Matches a CSS vendor-prefix or camelCase letter to convert to kebab-case */
const CAMEL_UPPER_RE = /-([a-z])/g

/** var(--name[, fallback]) — used in resolveValue */
const VAR_RE = /var\((--[\w-]+)(?:,([^)]+))?\)/g

/** Matches a single calc() call: calc(<inner>) */
const CALC_RE = /^calc\((.+)\)$/

/** value+unit * number  (first form) */
const CALC_MUL_UNIT_FIRST_RE = /^(-?[\d.]+)(rem|px|em|%|vw|vh)\s*\*\s*(-?[\d.]+)$/
/** number * value+unit  (second form) */
const CALC_MUL_NUM_FIRST_RE = /^(-?[\d.]+)\s*\*\s*(-?[\d.]+)(rem|px|em|%|vw|vh)$/
/** value+unit / number */
const CALC_DIV_RE = /^(-?[\d.]+)(rem|px|em|%|vw|vh)\s*\/\s*(-?[\d.]+)$/
/** unitless / unitless */
const CALC_UNITLESS_DIV_RE = /^(-?[\d.]+)\s*\/\s*(-?[\d.]+)$/

/** Plain number — no unit */
const PLAIN_NUMBER_RE = /^\d+(?:\.\d+)?$/

/** @layer theme { */
const THEME_LAYER_RE = /@layer theme\s*\{/

/** CSS custom property declaration: --var: value; */
const CSS_VAR_DECL_RE = /(--[\w-]+)\s*:([^;]*\S);/g

/** @layer utilities { */
const UTIL_LAYER_RE = /@layer utilities\s*\{/

/** Any @-rule opening */
const AT_RULE_RE = /@[\w-][^{]*\{/g

/** Class name characters after a '.' */
const CLASS_NAME_RE = /^([\w-]+)/

/** Optional whitespace then '{' */
const BRACE_START_RE = /^\s*\{/

/** Unit character in calc() second-form detection */
const UNIT_CHAR_RE = /[a-z%]/

/** Whitespace splitter for class lists */
const WHITESPACE_SPLIT_RE = /\s+/

/** className="..." or class="..." — four variants, hoisted */
const CLASS_ATTR_DOUBLE_RE = /className\s*=\s*"([^"]+)"/g
const CLASS_ATTR_SINGLE_RE = /className\s*=\s*'([^']+)'/g
const CLASS_PLAIN_DOUBLE_RE = /class\s*=\s*"([^"]+)"/g
const CLASS_PLAIN_SINGLE_RE = /class\s*=\s*'([^']+)'/g

// CSS property name → camelCase React style key
function cssPropertyToCamelCase(prop: string): string {
  // Handle vendor prefixes like -webkit-
  return prop.replace(CAMEL_UPPER_RE, (_, c: string) => c.toUpperCase())
}

// Parse a CSS value string, resolving var(--...) tokens using the theme map.
// Iterates until no more var() references remain or a cycle is detected (max 10 passes).
function resolveValue(value: string, themeVars: Map<string, string>): string {
  let current = value
  for (let i = 0; i < 10; i++) {
    VAR_RE.lastIndex = 0
    const next = current.replace(VAR_RE, (_, name: string, fallback: string) => {
      return themeVars.get(name) ?? fallback ?? `var(${name})`
    })
    if (next === current)
      break
    current = next
  }
  return current
}

/**
 * Evaluate simple calc() expressions that Tailwind v4 emits for spacing utilities,
 * e.g. `calc(0.25rem * 4)` → `"1rem"`, `calc(0.25rem * 0.5)` → `"0.125rem"`.
 *
 * Handles the patterns Tailwind v4 actually generates:
 *   calc(<number><unit> * <multiplier>)
 *   calc(<multiplier> * <number><unit>)
 *   calc(<number><unit> / <divisor>)
 *
 * Anything more complex (multiple terms, nested calc, etc.) is returned unchanged
 * so Satori can attempt to handle it or surface a clearer error.
 */
function evalCalc(value: string): string {
  // Only process strings that look like a single calc() call
  const calcMatch = value.match(CALC_RE)
  if (!calcMatch)
    return value

  const inner = calcMatch[1].trim()

  // Pattern: <value><unit> * <number>  or  <number> * <value><unit>
  const mulMatch = inner.match(CALC_MUL_UNIT_FIRST_RE) || inner.match(CALC_MUL_NUM_FIRST_RE)

  if (mulMatch) {
    // Normalise: figure out which capture is the coefficient and which has the unit
    let coeff: number
    let multiplier: number
    let unit: string

    if (mulMatch[3] && UNIT_CHAR_RE.test(mulMatch[3])) {
      // Second form: number * value+unit
      coeff = Number.parseFloat(mulMatch[1])
      multiplier = Number.parseFloat(mulMatch[2])
      unit = mulMatch[3]
    }
    else {
      // First form: value+unit * number
      coeff = Number.parseFloat(mulMatch[1])
      unit = mulMatch[2]
      multiplier = Number.parseFloat(mulMatch[3])
    }

    const result = coeff * multiplier
    // Trim floating-point noise: round to 4 decimal places
    const rounded = Number.parseFloat(result.toFixed(4))
    return `${rounded}${unit}`
  }

  // Pattern: <value><unit> / <number>
  const divMatch = inner.match(CALC_DIV_RE)
  if (divMatch) {
    const result = Number.parseFloat(divMatch[1]) / Number.parseFloat(divMatch[3])
    const rounded = Number.parseFloat(result.toFixed(4))
    return `${rounded}${divMatch[2]}`
  }

  // Pattern: <number> / <number>  (unitless division — e.g. line-height calc(1.75 / 1.125))
  const unitlessDivMatch = inner.match(CALC_UNITLESS_DIV_RE)
  if (unitlessDivMatch) {
    const result = Number.parseFloat(unitlessDivMatch[1]) / Number.parseFloat(unitlessDivMatch[2])
    return String(Number.parseFloat(result.toFixed(4)))
  }

  // Couldn't simplify — return as-is
  return value
}

// Convert a resolved CSS value to a number if it looks like a plain px/unitless value,
// otherwise keep as string (Satori accepts both)
function toStyleValue(value: string): string | number {
  const trimmed = evalCalc(value.trim())
  // Plain number (unitless, e.g. font-weight: 700)
  if (PLAIN_NUMBER_RE.test(trimmed))
    return Number.parseFloat(trimmed)
  return trimmed
}

// Parse @layer theme { :root { --var: value; } } and collect all CSS variables
function parseThemeVars(css: string): Map<string, string> {
  const vars = new Map<string, string>()

  // Find @layer theme block — handle nested braces
  const themeMatch = css.match(THEME_LAYER_RE)
  if (!themeMatch?.index)
    return vars

  let depth = 0
  const start = themeMatch.index
  let themeBlock = ''
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') {
      depth++
    }
    else if (css[i] === '}') {
      depth--
      if (depth === 0) {
        themeBlock = css.slice(start, i + 1)
        break
      }
    }
  }

  // Extract all --var: value; declarations
  CSS_VAR_DECL_RE.lastIndex = 0
  let m: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((m = CSS_VAR_DECL_RE.exec(themeBlock)) !== null) {
    vars.set(m[1], m[2].trim())
  }

  return vars
}

/**
 * Parse declarations inside a CSS rule body into a React.CSSProperties object.
 * Handles multi-line / multi-value declarations (e.g. background-image with
 * multiple gradient layers separated by commas across lines).
 */
function parseDeclarations(
  declarations: string,
  themeVars: Map<string, string>,
  className: string,
): React.CSSProperties {
  const style: React.CSSProperties = {}

  // Split on semicolons to get individual declarations.
  // Each piece may contain a property: value pair (or be blank/whitespace).
  const parts = declarations.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed)
      continue

    // Split only on the FIRST colon to get prop vs value
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1)
      continue

    const prop = trimmed.slice(0, colonIdx).trim()
    const rawValue = trimmed.slice(colonIdx + 1).trim()

    if (!prop || !rawValue)
      continue
    // Skip internal TW custom properties (--tw-*)
    if (prop.startsWith('--tw-'))
      continue
    // Skip properties Satori doesn't support at all
    if (prop === 'box-sizing' || prop === 'border-style')
      continue

    const resolved = resolveValue(rawValue, themeVars)
    if (resolved.includes('var(')) {
      throw new Error(
        `Failed to resolve CSS variable in class ".${className}": ${prop}: ${resolved}`,
      )
    }
    const camel = cssPropertyToCamelCase(prop) as keyof React.CSSProperties
    ;(style as Record<string, unknown>)[camel] = toStyleValue(resolved)
  }

  return style
}

/**
 * Extract all simple single-class rules from a CSS block string.
 * Handles nested braces correctly so values like `url("data:{...}")` don't
 * confuse the parser. Skips complex selectors (pseudo-classes, combinators,
 * media queries) because Satori can't use them.
 */
function extractClassRules(css: string): Array<{ className: string, body: string }> {
  const rules: Array<{ className: string, body: string }> = []
  const len = css.length
  let i = 0

  while (i < len) {
    // Find the next '.' that could start a class selector
    const dotIdx = css.indexOf('.', i)
    if (dotIdx === -1)
      break

    // Read the class name: word chars and hyphens only
    const nameMatch = css.slice(dotIdx + 1).match(CLASS_NAME_RE)
    if (!nameMatch) {
      i = dotIdx + 1
      continue
    }

    const className = nameMatch[1]
    const afterName = dotIdx + 1 + className.length

    // Skip optional whitespace, then expect '{'
    const rest = css.slice(afterName)
    const braceMatch = rest.match(BRACE_START_RE)
    if (!braceMatch) {
      i = afterName
      continue
    }

    const bodyStart = afterName + braceMatch[0].length
    // Walk forward counting braces to find the matching '}'
    let depth = 1
    let j = bodyStart
    while (j < len && depth > 0) {
      if (css[j] === '{')
        depth++
      else if (css[j] === '}')
        depth--
      j++
    }
    if (depth !== 0) {
      i = bodyStart
      continue
    }

    const body = css.slice(bodyStart, j - 1)
    rules.push({ className, body })
    i = j
  }

  return rules
}

// Parse @layer utilities { .classname { prop: value; } } into a class→style map,
// and also pick up plain top-level class rules that Tailwind emits for user-defined
// classes written directly in the CSS config (outside any @layer).
function parseUtilities(css: string, themeVars: Map<string, string>): ClassStyleMap {
  const map: ClassStyleMap = new Map()

  // ── 1. Extract @layer utilities block ──────────────────────────────────────
  const utilMatch = css.match(UTIL_LAYER_RE)
  let utilBlock = ''
  if (utilMatch?.index !== undefined) {
    let depth = 0
    const start = utilMatch.index
    for (let i = start; i < css.length; i++) {
      if (css[i] === '{') {
        depth++
      }
      else if (css[i] === '}') {
        depth--
        if (depth === 0) {
          utilBlock = css.slice(start, i + 1)
          break
        }
      }
    }
  }

  // ── 2. Build a "skip set" for known @layer / @... blocks so we only parse
  //       plain top-level rules below ─────────────────────────────────────────
  // We collect the byte ranges of all @-rule blocks to exclude them from the
  // top-level scan, preventing double-parsing of @layer utilities rules.
  const skipRanges: Array<[number, number]> = []
  AT_RULE_RE.lastIndex = 0
  let atMatch: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((atMatch = AT_RULE_RE.exec(css)) !== null) {
    const start = atMatch.index
    let depth = 0
    let end = start
    for (let i = start; i < css.length; i++) {
      if (css[i] === '{') {
        depth++
      }
      else if (css[i] === '}') {
        depth--
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }
    skipRanges.push([start, end])
  }

  // ── 3. Build top-level-only CSS (strip all @-rule blocks) ─────────────────
  let topLevel = css
  // Replace each @-rule block with spaces (preserve offsets for regex correctness)
  // We do it in reverse order to preserve indices
  for (let k = skipRanges.length - 1; k >= 0; k--) {
    const [s, e] = skipRanges[k]
    topLevel = topLevel.slice(0, s) + ' '.repeat(e - s) + topLevel.slice(e)
  }

  // ── 4. Parse rules from both sources ──────────────────────────────────────
  const sources = [
    { block: utilBlock, label: 'layer-utilities' },
    { block: topLevel, label: 'top-level' },
  ]

  for (const { block } of sources) {
    if (!block.trim())
      continue
    for (const { className, body } of extractClassRules(block)) {
      // Don't overwrite a rule already picked up from @layer utilities
      if (map.has(className))
        continue
      const style = parseDeclarations(body, themeVars, className)
      if (Object.keys(style).length > 0) {
        map.set(className, style)
      }
    }
  }

  return map
}

// Stylesheet resolver for tailwindcss compile()
async function loadStylesheet(id: string, base: string): Promise<{ content: string, base: string, path: string }> {
  let resolved: string
  if (id === 'tailwindcss') {
    resolved = join(twBase, 'index.css')
  }
  else if (isAbsolute(id)) {
    resolved = id
  }
  else {
    resolved = join(base, id)
  }

  try {
    const content = readFileSync(resolved, 'utf8')
    return { content, base: dirname(resolved), path: '' }
  }
  catch {
    return { content: '', base, path: '' }
  }
}

const DEFAULT_CSS_CONFIG = ''

/**
 * Build a className → React.CSSProperties map from a Tailwind v4 CSS config string.
 *
 * The cssConfig is CSS that is appended after `@import "tailwindcss"`, so users can
 * add @theme overrides, @utility definitions, or any other Tailwind v4 directives.
 *
 * @param cssConfig  The user's CSS config string (may be empty)
 * @param classNames The set of class names actually used in the template
 */
export async function buildClassStyleMap(
  cssConfig: string,
  classNames: string[],
): Promise<ClassStyleMap> {
  if (classNames.length === 0)
    return new Map()

  const userCss = cssConfig?.trim() || DEFAULT_CSS_CONFIG
  // Always prepend the Tailwind base import so all utilities are available
  const fullCss = userCss.includes('@import')
    ? userCss
    : `@import "tailwindcss";\n${userCss}`

  const result = await compile(fullCss, {
    base: twBase,
    loadStylesheet,
    loadModule: async () => ({ module: {}, base: twBase, path: '' }),
  })

  const css = result.build(classNames)
  const themeVars = parseThemeVars(css)
  return parseUtilities(css, themeVars)
}

/**
 * Extract all unique class names from a JSX/TSX code string.
 * Scans for className="..." and class="..." attribute values.
 */
export function extractClassNames(code: string): string[] {
  const classes = new Set<string>()
  const patterns = [
    CLASS_ATTR_DOUBLE_RE,
    CLASS_ATTR_SINGLE_RE,
    CLASS_PLAIN_DOUBLE_RE,
    CLASS_PLAIN_SINGLE_RE,
  ]
  for (const re of patterns) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(code)) !== null) {
      for (const cls of m[1].split(WHITESPACE_SPLIT_RE)) {
        if (cls)
          classes.add(cls)
      }
    }
  }
  return [...classes]
}
