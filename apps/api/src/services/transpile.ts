import type { ClassStyleMap } from './tailwind'
import { createRequire } from 'node:module'
import { Children, createElement, isValidElement } from 'react'
import { transform } from 'sucrase'

// ─── React element → HTML serialiser ─────────────────────────────────────────

const STARTS_WITH_UPPERCASE_RE = /^[A-Z]/
const UPPERCASE_CHAR_RE = /([A-Z])/g
const HTML_AMP_RE = /&/g
const HTML_LT_RE = /</g
const HTML_GT_RE = />/g
const HTML_QUOT_RE = /"/g
const WHITESPACE_RE = /\s+/

/**
 * Convert a camelCase React style key back to a CSS property name.
 * e.g. "backgroundColor" → "background-color", "WebkitTextStroke" → "-webkit-text-stroke"
 */
function styleKeyToCss(key: string): string {
  // Vendor prefix: starts with capital (Webkit, Moz, Ms)
  if (STARTS_WITH_UPPERCASE_RE.test(key)) {
    return `-${key.replace(UPPERCASE_CHAR_RE, c => `-${c.toLowerCase()}`)}`
  }
  return key.replace(UPPERCASE_CHAR_RE, c => `-${c.toLowerCase()}`)
}

function styleObjectToAttr(style: Record<string, unknown>): string {
  return Object.entries(style)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${styleKeyToCss(k)}: ${v}`)
    .join('; ')
}

function escapeHtml(s: string): string {
  return s
    .replace(HTML_AMP_RE, '&amp;')
    .replace(HTML_LT_RE, '&lt;')
    .replace(HTML_GT_RE, '&gt;')
    .replace(HTML_QUOT_RE, '&quot;')
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

/**
 * Recursively serialise a React element tree to an HTML string.
 * All style props are written as inline `style="..."` attributes so DevTools
 * shows exactly the styles that would be passed to Satori.
 */
export function elementToHtml(node: React.ReactNode): string {
  if (node == null || node === false)
    return ''
  if (typeof node === 'string')
    return escapeHtml(node)
  if (typeof node === 'number' || typeof node === 'bigint')
    return String(node)
  if (Array.isArray(node))
    return node.map(elementToHtml).join('')

  if (!isValidElement(node))
    return ''

  // Function components / class components: not expected here since
  // transpileTemplate already renders to host elements, but handle gracefully.
  if (typeof node.type === 'function') {
    try {
      const rendered = (node.type as React.FC)(node.props as Record<string, unknown>)
      return elementToHtml(rendered)
    }
    catch {
      return `<!-- could not render component ${(node.type as React.FC).name} -->`
    }
  }

  const tag = node.type as string
  const props = node.props as Record<string, unknown>

  // Build attribute string
  const attrs: string[] = []
  for (const [key, val] of Object.entries(props)) {
    if (key === 'children')
      continue
    if (val == null || val === false)
      continue
    if (key === 'style' && typeof val === 'object') {
      const css = styleObjectToAttr(val as Record<string, unknown>)
      if (css)
        attrs.push(`style="${escapeHtml(css)}"`)
      continue
    }
    // Map React prop names to HTML attribute names
    if (key === 'onClick' || key.startsWith('on'))
      continue // skip event handlers
    const REACT_ATTR_MAP: Record<string, string> = {
      className: 'class',
      htmlFor: 'for',
      tabIndex: 'tabindex',
      readOnly: 'readonly',
      autoFocus: 'autofocus',
      autoPlay: 'autoplay',
      crossOrigin: 'crossorigin',
      srcSet: 'srcset',
    }
    const attr = REACT_ATTR_MAP[key] ?? key.toLowerCase()
    if (val === true) {
      attrs.push(attr)
    }
    else if (typeof val === 'string' || typeof val === 'number') {
      attrs.push(`${attr}="${escapeHtml(String(val))}"`)
    }
  }

  const attrStr = attrs.length ? ` ${attrs.join(' ')}` : ''

  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrStr}>`
  }

  const children = elementToHtml(props.children as React.ReactNode)
  return `<${tag}${attrStr}>${children}</${tag}>`
}

const _require = createRequire(import.meta.url)

export class TranspileError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'TranspileError'
  }
}

/**
 * Recursively walk a React element tree and merge Tailwind class styles
 * into each element's `style` prop. Handles both `className` and `class`
 * attributes (Satori accepts `class` too).
 *
 * Returns a new element tree — React elements are immutable so we clone.
 */
function applyClassStyles(
  node: React.ReactNode,
  classStyleMap: ClassStyleMap,
): React.ReactNode {
  if (!isValidElement(node))
    return node

  const props = node.props as Record<string, unknown>
  const rawClass = (props.className || props.class || '') as string
  const children = props.children as React.ReactNode

  // Resolve Tailwind classes to a merged style object
  let twStyle: React.CSSProperties = {}

  if (rawClass) {
    for (const cls of rawClass.split(WHITESPACE_RE)) {
      const resolved = classStyleMap.get(cls)
      if (resolved)
        twStyle = { ...twStyle, ...resolved }
    }
  }

  // Merge with any existing inline style (inline takes precedence)
  const existingStyle = (props.style ?? {}) as React.CSSProperties
  const hasTwStyle = Object.keys(twStyle).length > 0
  const hasExistingStyle = Object.keys(existingStyle).length > 0
  const mergedStyle = hasTwStyle
    ? { ...twStyle, ...existingStyle }
    : hasExistingStyle
      ? existingStyle
      : undefined

  // Recursively process children
  const processedChildren = Children.map(children, child =>
    applyClassStyles(child, classStyleMap))

  const newProps: Record<string, unknown> = {
    ...props,
    // Remove className/class so Satori doesn't get confused by unknown props
    className: undefined,
    class: undefined,
  }
  if (mergedStyle !== undefined) {
    newProps.style = mergedStyle
  }
  if (processedChildren !== null) {
    newProps.children = processedChildren
  }

  return createElement(node.type as React.ElementType, newProps)
}

/**
 * Transforms a TSX string into a React element using Sucrase.
 * The code must default-export a React functional component.
 *
 * @param code The TSX source string to compile.
 * @param variables Variables passed into the component as props.
 * @param classStyleMap Optional Tailwind class→style map produced by buildClassStyleMap().
 *                      When provided, className/class props are resolved to inline styles
 *                      so Satori can render them.
 */
export function transpileTemplate(
  code: string,
  variables: Record<string, unknown>,
  classStyleMap?: ClassStyleMap,
): React.ReactElement {
  // 1. Transform TSX → CJS JS
  let transformed: string
  try {
    const result = transform(code, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'classic',
      production: false,
    })
    transformed = result.code
  }
  catch (err) {
    throw new TranspileError(
      `Syntax error in template: ${err instanceof Error ? err.message : String(err)}`,
      err,
    )
  }

  // 2. Execute in a restricted module-like context
  const moduleExports: Record<string, unknown> = {}
  const moduleObj = { exports: moduleExports }

  const requireShim = (id: string): unknown => {
    if (id === 'react')
      return _require('react')
    throw new TranspileError(`Template tried to require forbidden module: "${id}"`)
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('require', 'module', 'exports', 'React', 'Gallery', transformed)
    fn(requireShim, moduleObj, moduleExports, _require('react'), variables.Gallery ?? {})
  }
  catch (err) {
    throw new TranspileError(
      `Runtime error in template: ${err instanceof Error ? err.message : String(err)}`,
      err,
    )
  }

  // 3. Get the default export
  const exports = moduleObj.exports as Record<string, unknown>
  const Component = (exports.default ?? exports) as
    | React.ComponentType<Record<string, unknown>>
    | undefined

  if (typeof Component !== 'function') {
    throw new TranspileError(
      'Template must default-export a React functional component',
    )
  }

  // 4. If a class-style map was provided, call the component directly to get
  //    the rendered element tree, then walk it to apply Tailwind styles.
  //    We cannot call applyClassStyles on the outer <Component> element because
  //    it is a function-type React element — the className/style props only
  //    exist on the host (string-type) elements inside the rendered output.
  if (classStyleMap && classStyleMap.size > 0) {
    // @ts-expect-error — Component is typed as ComponentType<Props> but we call it directly as a function
    const rendered = Component(variables) as React.ReactElement
    return applyClassStyles(rendered, classStyleMap) as React.ReactElement
  }

  // 5. Otherwise just wrap in an element as usual
  return createElement(Component, variables) as React.ReactElement
}
