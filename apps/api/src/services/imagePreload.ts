import { Children, createElement, isValidElement } from 'react'
import { resolveImageUrl } from './imageCache'

// Matches url("..."), url('...'), or url(...) and captures the inner URL.
// Uses explicit alternation for quoted/unquoted forms to avoid backtracking.
const BACKGROUND_IMAGE_URL_REGEX = /^url\((?:"([^"]*)"|'([^']*)'|([^)']*))\)$/

/**
 * Extract a URL from a CSS `background-image` value like `url("https://...")`.
 * Returns the URL string, or null if the value is not a url(...) form.
 */
function extractBackgroundImageUrl(value: string): string | null {
  const match = value.match(BACKGROUND_IMAGE_URL_REGEX)
  if (!match)
    return null
  // One of the three capture groups will be defined
  return (match[1] ?? match[2] ?? match[3] ?? '').trim() || null
}

/**
 * Build a new `backgroundImage` style value with the URL replaced.
 */
function replaceBackgroundImageUrl(original: string, newUrl: string): string {
  // Preserve any surrounding url() wrapper quotes style
  return `url("${newUrl}")`
}

/**
 * Recursively walk a React element tree and replace all remote image URLs
 * with inline `data:` URIs (using the image cache).
 *
 * Handles:
 * - `<img src="https://...">` — replaces the `src` prop
 * - `style.backgroundImage: url("https://...")` — replaces the URL inside
 *
 * Returns a new cloned element tree (React elements are immutable).
 */
export async function preloadImages(
  node: React.ReactNode,
): Promise<React.ReactNode> {
  if (node == null || node === false)
    return node
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint')
    return node
  if (Array.isArray(node)) {
    return Promise.all(node.map(preloadImages))
  }

  if (!isValidElement(node))
    return node

  const props = node.props as Record<string, unknown>
  const newProps: Record<string, unknown> = { ...props }

  // 1. Resolve <img src="...">
  if (node.type === 'img' && typeof props.src === 'string') {
    newProps.src = await resolveImageUrl(props.src)
  }

  // 2. Resolve style.backgroundImage: url(...)
  if (props.style && typeof props.style === 'object') {
    const style = props.style as Record<string, unknown>
    if (typeof style.backgroundImage === 'string') {
      const url = extractBackgroundImageUrl(style.backgroundImage)
      if (url) {
        const resolved = await resolveImageUrl(url)
        if (resolved !== url) {
          newProps.style = {
            ...style,
            backgroundImage: replaceBackgroundImageUrl(style.backgroundImage, resolved),
          }
        }
      }
    }
  }

  // 3. Recurse into children
  const children = props.children as React.ReactNode
  if (children != null) {
    const processedChildren = await Promise.all(
      Children.toArray(children).map(preloadImages),
    )
    newProps.children = processedChildren.length === 1
      ? processedChildren[0]
      : processedChildren
  }

  return createElement(node.type as React.ElementType, newProps)
}
