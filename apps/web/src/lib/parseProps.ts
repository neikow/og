/**
 * Parse the `Props` interface from a TSX template string and extract
 * OGVariable definitions. Supports the custom default-value comment syntax:
 *
 *   export interface Props {
 *     title: string    // = "Hello"
 *     count: number    // = 42
 *     visible: boolean // = true
 *   }
 *
 * Lines with `?` suffix are treated as optional (required: false).
 * All others default to required: true.
 */

import type { OGVariable, OGVariableType } from '@og/shared'

/** Parse result: variables extracted from the Props interface. */
export interface ParsedProps {
  variables: OGVariable[]
}

const PROPS_INTERFACE_REGEX = /(?:export\s+)?interface\s+Props\s*\{/

/**
 * Extract the body of the first `interface Props { ... }` block.
 * Handles nested braces correctly.
 */
function extractPropsBody(code: string): string | null {
  // Match "interface Props {" optionally preceded by "export "
  const match = code.match(PROPS_INTERFACE_REGEX)
  if (!match || match.index === undefined)
    return null

  let depth = 0
  const start = match.index + match[0].length - 1 // points at the opening {
  let body = ''

  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') {
      depth++
    }
    else if (code[i] === '}') {
      depth--
      if (depth === 0) {
        body = code.slice(start + 1, i) // contents between { and }
        break
      }
    }
  }

  return body || null
}

// eslint-disable-next-line regexp/no-super-linear-backtracking
const COMMENT_REGEX = /\/\/\s*=\s*(.+)$/
const TRAILING_SEMICOLON_REGEX = /;?\s*$/
// eslint-disable-next-line regexp/no-super-linear-backtracking
const PROP_REGEX = /^([\w$]+)(\?)?\s*:\s*(.+)$/

/**
 * Parse a single line of the Props interface body.
 * Returns an OGVariable or null if the line can't be parsed.
 *
 * Supported line formats:
 *   name: string
 *   name?: string
 *   name: number // = 42
 *   name?: boolean // = true
 */
function parsePropLine(line: string): OGVariable | null {
  // Strip inline comment to separate default value
  // Syntax: `// = value` at end of line
  let defaultValue: string | undefined
  const commentMatch = line.match(COMMENT_REGEX)
  if (commentMatch) {
    const raw = commentMatch[1].trim()
    // Unquote string literals: "hello" → hello
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith('\'') && raw.endsWith('\''))) {
      defaultValue = raw.slice(1, -1)
    }
    else {
      defaultValue = raw
    }
    line = line.slice(0, commentMatch.index).trim()
  }

  // Remove trailing semicolons and whitespace from the declaration
  line = line.replace(TRAILING_SEMICOLON_REGEX, '').trim()

  if (!line)
    return null

  // Match: identifier (optionally with ?) : type
  // e.g. "  title?: string" or "count: number"
  const propMatch = line.match(PROP_REGEX)
  if (!propMatch)
    return null

  const name = propMatch[1]
  const optional = propMatch[2] === '?'
  const rawType = propMatch[3].trim()

  // Map TS primitive types to OGVariableType
  let type: OGVariableType
  if (rawType === 'string') {
    type = 'string'
  }
  else if (rawType === 'number') {
    type = 'number'
  }
  else if (rawType === 'boolean') {
    type = 'boolean'
  }
  else {
    // Unsupported type — skip
    return null
  }

  return {
    name,
    type,
    required: !optional,
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
  }
}

/**
 * Parse the Props interface from a TSX template string.
 * Returns extracted OGVariables (only string, number, boolean).
 */
export function parsePropsInterface(code: string): ParsedProps {
  const body = extractPropsBody(code)
  if (!body)
    return { variables: [] }

  const variables: OGVariable[] = []

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    // Skip blank lines and pure-comment lines
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*'))
      continue

    const variable = parsePropLine(line)
    if (variable) {
      variables.push(variable)
    }
  }

  return { variables }
}

/**
 * Serialise a single OGVariable back to a Props interface line.
 *
 *   { name: 'title', type: 'string', required: true, default: 'Hello' }
 *   → "  title: string // = \"Hello\""
 */
function serializePropLine(v: OGVariable): string {
  const optional = v.required ? '' : '?'
  const base = `  ${v.name}${optional}: ${v.type}`
  if (v.default !== undefined && v.default !== '') {
    const quoted = v.type === 'string' ? `"${v.default}"` : v.default
    return `${base} // = ${quoted}`
  }
  return base
}

/**
 * Serialise an array of OGVariables to a `export interface Props { ... }` block.
 */
export function serializePropsInterface(variables: OGVariable[]): string {
  if (variables.length === 0)
    return 'export interface Props {}'
  const lines = variables.map(serializePropLine).join('\n')
  return `export interface Props {\n${lines}\n}`
}

/** Matches only the `interface Props {` header — no body, no backtracking risk. */
const PROPS_INTERFACE_HEADER_REGEX = /(?:export\s+)?interface\s+Props\s*\{/

/**
 * Replace the `interface Props { ... }` block inside `code` with a freshly
 * serialised version derived from `variables`.
 *
 * If no Props interface exists, one is inserted at the top of the file.
 * Returns the updated code string.
 *
 * Uses a brace-depth walker instead of [\s\S]*? to avoid superlinear
 * backtracking on large inputs.
 */
export function patchPropsInCode(code: string, variables: OGVariable[]): string {
  const match = code.match(PROPS_INTERFACE_HEADER_REGEX)
  if (!match || match.index === undefined) {
    // No existing interface — prepend one
    const block = serializePropsInterface(variables)
    return code.trimStart() ? `${block}\n\n${code}` : block
  }

  // Walk forward from the opening `{` to find the matching `}`
  const blockStart = match.index + match[0].length - 1 // index of opening {
  let depth = 0
  let blockEnd = -1
  for (let i = blockStart; i < code.length; i++) {
    if (code[i] === '{') {
      depth++
    }
    else if (code[i] === '}') {
      depth--
      if (depth === 0) {
        blockEnd = i
        break
      }
    }
  }

  if (blockEnd === -1)
    return code // malformed — leave untouched

  const before = code.slice(0, match.index)
  const after = code.slice(blockEnd + 1)
  const newBlock = serializePropsInterface(variables)
  return `${before}${newBlock}${after}`
}

/**
 * Merge variables parsed from the Props interface with the current
 * manually-managed variable list. Rules:
 *
 * - Props-parsed variables take precedence for type and required.
 * - Existing default values are preserved if no new default is provided in code.
 * - Variables not in Props are removed.
 * - Order follows the Props interface declaration order.
 */
export function mergeVariables(
  parsed: OGVariable[],
  existing: OGVariable[],
): OGVariable[] {
  const existingMap = new Map(existing.map(v => [v.name, v]))

  return parsed.map((p) => {
    const prev = existingMap.get(p.name)
    return {
      name: p.name,
      type: p.type,
      required: p.required,
      // Use parsed default if present; fall back to existing default
      default: p.default !== undefined ? p.default : (prev?.default ?? ''),
    }
  })
}
