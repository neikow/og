// ─── Template ────────────────────────────────────────────────────────────────

export type OGVariableType = 'string' | 'number' | 'boolean'

export interface OGVariable {
  name: string
  type: OGVariableType
  required: boolean
  default?: string
}

export interface Template {
  id: string
  name: string
  code: string
  cssConfig: string
  variableSchema: OGVariable[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface TemplateWithFonts extends Template {
  fonts: Font[]
}

export interface CreateTemplateInput {
  name: string
  code?: string
  cssConfig?: string
  variableSchema?: OGVariable[]
  tags?: string[]
  fontIds?: string[]
}

export interface UpdateTemplateInput {
  name?: string
  code?: string
  cssConfig?: string
  variableSchema?: OGVariable[]
  tags?: string[]
  fontIds?: string[]
}

// ─── Font ─────────────────────────────────────────────────────────────────────

export type FontSource = 'upload' | 'google'
export type FontStyle = 'normal' | 'italic'
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

export interface Font {
  id: string
  family: string
  weight: FontWeight
  style: FontStyle
  source: FontSource
  filePath: string
  createdAt: string
}

export interface AddHostedFontInput {
  family: string
  variants: string[] // e.g. ['400', '700', '400italic']
}

// ─── API Key ──────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string
  name: string
  tagRestrictions: string[]
  createdAt: string
  lastUsedAt: string | null
}

export interface CreateApiKeyInput {
  name: string
  tagRestrictions?: string[]
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey
  rawKey: string // shown once only
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  email: string
  name: string
  avatarUrl: string
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export interface PreviewInput {
  code: string
  cssConfig?: string
  variables: Record<string, string>
  variableSchema?: OGVariable[]
  fontIds: string[]
}

// ─── Assets (Gallery) ─────────────────────────────────────────────────────────

export interface Asset {
  id: string
  identifier: string
  filename: string
  mimeType: string
  /** Public URL to fetch the image bytes (served by the API). */
  url: string
  createdAt: string
}

export interface CreateAssetInput {
  /** Dot-notation safe identifier, e.g. "hero_image". */
  identifier: string
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  details?: string
}

export type ApiResponse<T> = T | ApiError

// ─── Satori CSS subset (for editor type hints) ────────────────────────────────

/**
 * A subset of React.CSSProperties limited to what Satori supports.
 * Used to provide accurate autocomplete in the live editor.
 */
export interface SatoriCSSProperties {
  // Layout (Flexbox only — Satori uses Yoga)
  display?: 'flex' | 'none'
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  flex?: number | string
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number | string
  alignItems?: 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline'
  alignContent?: 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around'
  alignSelf?: 'auto' | 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline'
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  gap?: number | string
  rowGap?: number | string
  columnGap?: number | string

  // Sizing
  width?: number | string
  height?: number | string
  minWidth?: number | string
  minHeight?: number | string
  maxWidth?: number | string
  maxHeight?: number | string

  // Position
  position?: 'relative' | 'absolute' | 'static'
  top?: number | string
  right?: number | string
  bottom?: number | string
  left?: number | string

  // Spacing
  margin?: number | string
  marginTop?: number | string
  marginRight?: number | string
  marginBottom?: number | string
  marginLeft?: number | string
  padding?: number | string
  paddingTop?: number | string
  paddingRight?: number | string
  paddingBottom?: number | string
  paddingLeft?: number | string

  // Border
  border?: string
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  borderWidth?: number | string
  borderTopWidth?: number | string
  borderRightWidth?: number | string
  borderBottomWidth?: number | string
  borderLeftWidth?: number | string
  borderColor?: string
  borderStyle?: 'solid' | 'dashed'
  borderRadius?: number | string
  borderTopLeftRadius?: number | string
  borderTopRightRadius?: number | string
  borderBottomLeftRadius?: number | string
  borderBottomRightRadius?: number | string

  // Color & Background
  color?: string
  opacity?: number
  background?: string
  backgroundColor?: string
  backgroundImage?: string
  backgroundSize?: string
  backgroundPosition?: string
  backgroundRepeat?: string
  backgroundClip?: 'border-box' | 'padding-box' | 'content-box' | 'text'

  // Typography
  fontFamily?: string
  fontSize?: number | string
  fontWeight?: FontWeight | string
  fontStyle?: 'normal' | 'italic'
  lineHeight?: number | string
  letterSpacing?: number | string
  textAlign?: 'left' | 'right' | 'center' | 'justify'
  textDecoration?: string
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase'
  textOverflow?: 'clip' | 'ellipsis'
  textShadow?: string
  whiteSpace?: 'normal' | 'pre' | 'pre-wrap' | 'pre-line' | 'nowrap'
  wordBreak?: 'normal' | 'break-all' | 'keep-all' | 'break-word'
  WebkitTextStroke?: string
  WebkitTextStrokeWidth?: string
  WebkitTextStrokeColor?: string

  // Effects
  boxShadow?: string
  filter?: string
  transform?: string
  transformOrigin?: string
  overflow?: 'visible' | 'hidden'
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  objectPosition?: string
  clipPath?: string

  // Misc
  cursor?: string
}
