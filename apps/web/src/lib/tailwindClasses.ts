/**
 * Tailwind CSS v4 class completion data for Monaco editor.
 *
 * Generates a flat array of { label, detail } entries covering
 * the full set of Tailwind v4 utility classes including all
 * color palette variants and responsive/state modifiers.
 */

export interface TailwindClass {
  label: string
  detail?: string
}

// ─── Color palette ────────────────────────────────────────────────────────────

const COLOR_NAMES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'mauve',
  'mist',
  'olive',
  'taupe',
]
const COLOR_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const NAMED_COLORS = ['black', 'white', 'transparent', 'current', 'inherit']

function colorVariants(prefix: string): TailwindClass[] {
  const out: TailwindClass[] = []
  for (const name of COLOR_NAMES) {
    for (const shade of COLOR_SHADES) {
      out.push({ label: `${prefix}-${name}-${shade}` })
    }
  }
  for (const name of NAMED_COLORS) {
    out.push({ label: `${prefix}-${name}` })
  }
  return out
}

// ─── Spacing scale ────────────────────────────────────────────────────────────

const SPACING = [
  '0',
  'px',
  '0.5',
  '1',
  '1.5',
  '2',
  '2.5',
  '3',
  '3.5',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '14',
  '16',
  '20',
  '24',
  '28',
  '32',
  '36',
  '40',
  '44',
  '48',
  '52',
  '56',
  '60',
  '64',
  '72',
  '80',
  '96',
]
const FRACTION_SIZES = [
  '1/2',
  '1/3',
  '2/3',
  '1/4',
  '2/4',
  '3/4',
  '1/5',
  '2/5',
  '3/5',
  '4/5',
  '1/6',
  '2/6',
  '3/6',
  '4/6',
  '5/6',
  'full',
  'screen',
  'svh',
  'lvh',
  'dvh',
  'min',
  'max',
  'fit',
  'auto',
]

// ─── Generate all classes ─────────────────────────────────────────────────────

function generate(): TailwindClass[] {
  const classes: TailwindClass[] = []

  // Layout
  classes.push(
    { label: 'block', detail: 'display: block' },
    { label: 'inline-block', detail: 'display: inline-block' },
    { label: 'inline', detail: 'display: inline' },
    { label: 'flex', detail: 'display: flex' },
    { label: 'inline-flex', detail: 'display: inline-flex' },
    { label: 'grid', detail: 'display: grid' },
    { label: 'inline-grid', detail: 'display: inline-grid' },
    { label: 'hidden', detail: 'display: none' },
    { label: 'contents', detail: 'display: contents' },
    { label: 'table', detail: 'display: table' },
    { label: 'flow-root', detail: 'display: flow-root' },
    { label: 'list-item', detail: 'display: list-item' },
  )

  // Float
  for (const v of ['right', 'left', 'start', 'end', 'none']) {
    classes.push({ label: `float-${v}` })
  }

  // Clear
  for (const v of ['left', 'right', 'both', 'start', 'end', 'none']) {
    classes.push({ label: `clear-${v}` })
  }

  // Isolation
  classes.push({ label: 'isolate' }, { label: 'isolation-auto' })

  // Object fit
  for (const v of ['contain', 'cover', 'fill', 'none', 'scale-down']) {
    classes.push({ label: `object-${v}` })
  }
  for (const v of ['bottom', 'center', 'left', 'left-bottom', 'left-top', 'right', 'right-bottom', 'right-top', 'top']) {
    classes.push({ label: `object-${v}` })
  }

  // Overflow
  for (const dir of ['', 'x-', 'y-']) {
    for (const v of ['auto', 'hidden', 'clip', 'visible', 'scroll']) {
      classes.push({ label: `overflow-${dir}${v}` })
    }
  }

  // Overscroll
  for (const dir of ['', 'x-', 'y-']) {
    for (const v of ['auto', 'contain', 'none']) {
      classes.push({ label: `overscroll-${dir}${v}` })
    }
  }

  // Position
  for (const v of ['static', 'fixed', 'absolute', 'relative', 'sticky']) {
    classes.push({ label: v })
  }

  // TRBL
  for (const dir of ['top', 'right', 'bottom', 'left', 'inset', 'inset-x', 'inset-y', 'start', 'end']) {
    for (const s of [...SPACING, ...FRACTION_SIZES, 'auto']) {
      classes.push({ label: `${dir}-${s}` })
    }
    classes.push({ label: `-${dir}-${0}` })
  }

  // Visibility
  classes.push({ label: 'visible' }, { label: 'invisible' }, { label: 'collapse' })

  // Z-index
  for (const v of ['0', '10', '20', '30', '40', '50', 'auto']) {
    classes.push({ label: `z-${v}` })
  }

  // Flexbox & Grid
  // Flex direction
  for (const v of ['row', 'row-reverse', 'col', 'col-reverse']) {
    classes.push({ label: `flex-${v}` })
  }
  // Flex wrap
  for (const v of ['wrap', 'wrap-reverse', 'nowrap']) {
    classes.push({ label: `flex-${v}` })
  }
  // Flex
  for (const v of ['1', 'auto', 'initial', 'none']) {
    classes.push({ label: `flex-${v}` })
  }
  // Grow / shrink
  for (const v of ['', '0']) {
    classes.push({ label: `grow${v ? `-${v}` : ''}` })
    classes.push({ label: `shrink${v ? `-${v}` : ''}` })
  }
  // Basis
  for (const s of [...SPACING, ...FRACTION_SIZES]) {
    classes.push({ label: `basis-${s}` })
  }

  // Grid template columns/rows
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    classes.push({ label: `grid-cols-${n}` })
    classes.push({ label: `grid-rows-${n}` })
  }
  for (const v of ['none', 'subgrid']) {
    classes.push({ label: `grid-cols-${v}` })
    classes.push({ label: `grid-rows-${v}` })
  }

  // Col/Row span
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    classes.push({ label: `col-span-${n}` })
    classes.push({ label: `row-span-${n}` })
  }
  classes.push({ label: 'col-span-full' }, { label: 'row-span-full' })

  // Gap
  for (const s of SPACING) {
    classes.push({ label: `gap-${s}` })
    classes.push({ label: `gap-x-${s}` })
    classes.push({ label: `gap-y-${s}` })
  }

  // Justify content/items/self
  for (const v of ['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch', 'baseline', 'normal']) {
    classes.push({ label: `justify-${v}` })
  }
  for (const v of ['start', 'end', 'center', 'stretch', 'baseline']) {
    classes.push({ label: `justify-items-${v}` })
    classes.push({ label: `justify-self-${v}` })
  }
  classes.push({ label: 'justify-self-auto' })

  // Align content/items/self
  for (const v of ['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch', 'baseline', 'normal']) {
    classes.push({ label: `content-${v}` })
  }
  for (const v of ['start', 'end', 'center', 'stretch', 'baseline']) {
    classes.push({ label: `items-${v}` })
    classes.push({ label: `self-${v}` })
  }
  classes.push({ label: 'items-baseline-last' }, { label: 'self-auto' })

  // Place content/items/self
  for (const v of ['center', 'start', 'end', 'between', 'around', 'evenly', 'stretch', 'baseline']) {
    classes.push({ label: `place-content-${v}` })
    classes.push({ label: `place-items-${v}` })
    classes.push({ label: `place-self-${v}` })
  }

  // Spacing (margin/padding)
  const directions = ['', 't', 'r', 'b', 'l', 'x', 'y', 's', 'e']
  for (const dir of directions) {
    const d = dir ? `-${dir}` : ''
    for (const s of [...SPACING, 'auto']) {
      classes.push({ label: `m${d}-${s}` })
      classes.push({ label: `p${d}-${s}` })
      classes.push({ label: `-m${d}-${s}` }) // negative margins
    }
  }

  // Width / height
  for (const s of [...SPACING, ...FRACTION_SIZES]) {
    classes.push({ label: `w-${s}` })
    classes.push({ label: `h-${s}` })
    classes.push({ label: `min-w-${s}` })
    classes.push({ label: `min-h-${s}` })
    classes.push({ label: `max-w-${s}` })
    classes.push({ label: `max-h-${s}` })
    classes.push({ label: `size-${s}` })
  }
  for (const v of ['prose', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl']) {
    classes.push({ label: `max-w-${v}` })
  }

  // Typography
  // Font family
  classes.push({ label: 'font-sans' }, { label: 'font-serif' }, { label: 'font-mono' })

  // Font size
  for (const v of ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl']) {
    classes.push({ label: `text-${v}` })
  }

  // Font smoothing
  classes.push({ label: 'antialiased' }, { label: 'subpixel-antialiased' })

  // Font style
  classes.push({ label: 'italic' }, { label: 'not-italic' })

  // Font weight
  for (const v of ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black']) {
    classes.push({ label: `font-${v}` })
  }
  for (const w of [100, 200, 300, 400, 500, 600, 700, 800, 900]) {
    classes.push({ label: `font-${w}` })
  }

  // Font variant numeric
  for (const v of [
    'normal-nums',
    'ordinal',
    'slashed-zero',
    'lining-nums',
    'oldstyle-nums',
    'proportional-nums',
    'tabular-nums',
    'diagonal-fractions',
    'stacked-fractions',
  ]) {
    classes.push({ label: v })
  }

  // Letter spacing
  for (const v of ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest']) {
    classes.push({ label: `tracking-${v}` })
  }

  // Line clamp
  for (const n of [1, 2, 3, 4, 5, 6]) {
    classes.push({ label: `line-clamp-${n}` })
  }
  classes.push({ label: 'line-clamp-none' })

  // Line height
  for (const v of ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose']) {
    classes.push({ label: `leading-${v}` })
  }
  for (const s of SPACING) {
    classes.push({ label: `leading-${s}` })
  }

  // List style
  for (const v of ['none', 'disc', 'decimal', 'square', 'roman']) {
    classes.push({ label: `list-${v}` })
  }
  for (const v of ['inside', 'outside']) {
    classes.push({ label: `list-${v}` })
  }

  // Text alignment
  for (const v of ['left', 'center', 'right', 'justify', 'start', 'end']) {
    classes.push({ label: `text-${v}` })
  }

  // Text color
  classes.push(...colorVariants('text'))

  // Text decoration
  for (const v of ['underline', 'overline', 'line-through', 'no-underline']) {
    classes.push({ label: v })
  }

  // Text decoration color
  classes.push(...colorVariants('decoration'))

  // Text decoration style
  for (const v of ['solid', 'double', 'dotted', 'dashed', 'wavy']) {
    classes.push({ label: `decoration-${v}` })
  }

  // Text decoration thickness
  for (const v of ['auto', 'from-font', '0', '1', '2', '4', '8']) {
    classes.push({ label: `decoration-${v}` })
  }

  // Text underline offset
  for (const v of ['auto', '0', '1', '2', '4', '8']) {
    classes.push({ label: `underline-offset-${v}` })
  }

  // Text transform
  for (const v of ['uppercase', 'lowercase', 'capitalize', 'normal-case']) {
    classes.push({ label: v })
  }

  // Text overflow
  classes.push({ label: 'truncate' }, { label: 'text-ellipsis' }, { label: 'text-clip' })

  // Text wrap
  for (const v of ['wrap', 'nowrap', 'balance', 'pretty']) {
    classes.push({ label: `text-${v}` })
  }

  // Whitespace
  for (const v of ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']) {
    classes.push({ label: `whitespace-${v}` })
  }

  // Word break
  classes.push({ label: 'break-normal' }, { label: 'break-words' }, { label: 'break-all' }, { label: 'break-keep' })

  // Hyphens
  for (const v of ['none', 'manual', 'auto']) {
    classes.push({ label: `hyphens-${v}` })
  }

  // Content
  classes.push({ label: 'content-none' })

  // Backgrounds
  // Background attachment
  for (const v of ['fixed', 'local', 'scroll']) {
    classes.push({ label: `bg-${v}` })
  }
  // Background clip
  for (const v of ['border', 'padding', 'content', 'text']) {
    classes.push({ label: `bg-clip-${v}` })
  }
  // Background color
  classes.push(...colorVariants('bg'))
  // Background origin
  for (const v of ['border', 'padding', 'content']) {
    classes.push({ label: `bg-origin-${v}` })
  }
  // Background position
  for (const v of ['bottom', 'center', 'left', 'left-bottom', 'left-top', 'right', 'right-bottom', 'right-top', 'top']) {
    classes.push({ label: `bg-${v}` })
  }
  // Background repeat
  for (const v of ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'repeat-round', 'repeat-space']) {
    classes.push({ label: `bg-${v}` })
  }
  // Background size
  for (const v of ['auto', 'cover', 'contain']) {
    classes.push({ label: `bg-${v}` })
  }
  // Gradients
  for (const dir of ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl']) {
    classes.push({ label: `bg-gradient-to-${dir}` })
  }
  for (const color of ['from', 'via', 'to']) {
    classes.push(...colorVariants(color))
  }

  // Borders
  // Border radius
  for (const size of ['none', 'sm', '', 'md', 'lg', 'xl', '2xl', '3xl', 'full']) {
    const suf = size ? `-${size}` : ''
    classes.push({ label: `rounded${suf}` })
    for (const pos of ['t', 'r', 'b', 'l', 'tl', 'tr', 'bl', 'br', 'ss', 'se', 'es', 'ee']) {
      classes.push({ label: `rounded-${pos}${suf}` })
    }
  }

  // Border width
  for (const side of ['', 't', 'r', 'b', 'l', 'x', 'y', 's', 'e']) {
    const suf = side ? `-${side}` : ''
    for (const w of ['0', '', '2', '4', '8']) {
      classes.push({ label: `border${suf}${w ? `-${w}` : ''}` })
    }
  }

  // Border color
  classes.push(...colorVariants('border'))

  // Border style
  for (const v of ['solid', 'dashed', 'dotted', 'double', 'hidden', 'none']) {
    classes.push({ label: `border-${v}` })
  }

  // Divide
  for (const dir of ['x', 'y']) {
    for (const w of ['0', '2', '4', '8', 'reverse', '']) {
      classes.push({ label: `divide-${dir}${w ? `-${w}` : ''}` })
    }
  }
  classes.push(...colorVariants('divide'))

  // Outline
  for (const w of ['0', '1', '2', '4', '8']) {
    classes.push({ label: `outline-${w}` })
  }
  for (const v of ['none', 'dashed', 'dotted', 'double']) {
    classes.push({ label: `outline-${v}` })
  }
  classes.push(...colorVariants('outline'))
  for (const v of ['0', '1', '2', '4', '8']) {
    classes.push({ label: `outline-offset-${v}` })
  }

  // Ring
  for (const w of ['0', '1', '2', '4', '8', '']) {
    classes.push({ label: `ring${w ? `-${w}` : ''}` })
    classes.push({ label: `ring-inset${w ? `-${w}` : ''}` })
  }
  classes.push(...colorVariants('ring'))
  for (const w of ['0', '1', '2', '4', '8']) {
    classes.push({ label: `ring-offset-${w}` })
  }
  classes.push(...colorVariants('ring-offset'))

  // Effects
  // Box shadow
  for (const v of ['sm', '', 'md', 'lg', 'xl', '2xl', 'inner', 'none']) {
    classes.push({ label: `shadow${v ? `-${v}` : ''}` })
  }
  classes.push(...colorVariants('shadow'))

  // Opacity
  for (const v of [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]) {
    classes.push({ label: `opacity-${v}` })
  }

  // Mix blend mode
  for (const v of ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'plus-lighter', 'plus-darker']) {
    classes.push({ label: `mix-blend-${v}` })
  }

  // Filters
  // Blur
  for (const v of ['none', 'sm', '', 'md', 'lg', 'xl', '2xl', '3xl']) {
    classes.push({ label: `blur${v ? `-${v}` : ''}` })
  }
  // Brightness
  for (const v of [0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200]) {
    classes.push({ label: `brightness-${v}` })
  }
  // Contrast
  for (const v of [0, 50, 75, 100, 125, 150, 200]) {
    classes.push({ label: `contrast-${v}` })
  }
  // Drop shadow
  for (const v of ['sm', '', 'md', 'lg', 'xl', '2xl', 'none']) {
    classes.push({ label: `drop-shadow${v ? `-${v}` : ''}` })
  }
  // Grayscale
  classes.push({ label: 'grayscale' }, { label: 'grayscale-0' })
  // Hue rotate
  for (const v of [0, 15, 30, 60, 90, 180]) {
    classes.push({ label: `hue-rotate-${v}` })
    classes.push({ label: `-hue-rotate-${v}` })
  }
  // Invert
  classes.push({ label: 'invert' }, { label: 'invert-0' })
  // Saturate
  for (const v of [0, 50, 100, 150, 200]) {
    classes.push({ label: `saturate-${v}` })
  }
  // Sepia
  classes.push({ label: 'sepia' }, { label: 'sepia-0' })

  // Backdrop filters (same pattern)
  for (const v of ['none', 'sm', '', 'md', 'lg', 'xl', '2xl', '3xl']) {
    classes.push({ label: `backdrop-blur${v ? `-${v}` : ''}` })
  }
  for (const v of [0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200]) {
    classes.push({ label: `backdrop-brightness-${v}` })
    classes.push({ label: `backdrop-contrast-${v <= 200 ? v : ''}` })
  }
  classes.push({ label: 'backdrop-grayscale' }, { label: 'backdrop-grayscale-0' })
  classes.push({ label: 'backdrop-invert' }, { label: 'backdrop-invert-0' })
  classes.push({ label: 'backdrop-sepia' }, { label: 'backdrop-sepia-0' })
  for (const v of [0, 50, 100, 150, 200]) {
    classes.push({ label: `backdrop-saturate-${v}` })
    classes.push({ label: `backdrop-opacity-${v}` })
  }
  for (const v of ['sm', '', 'md', 'lg', 'xl', '2xl', 'none']) {
    classes.push({ label: `backdrop-drop-shadow${v ? `-${v}` : ''}` })
  }

  // Tables
  for (const v of ['auto', 'fixed']) {
    classes.push({ label: `table-${v}` })
  }
  for (const v of ['collapse', 'separate']) {
    classes.push({ label: `border-${v}` })
  }
  for (const s of SPACING) {
    classes.push({ label: `border-spacing-${s}` })
    classes.push({ label: `border-spacing-x-${s}` })
    classes.push({ label: `border-spacing-y-${s}` })
  }
  for (const v of ['top', 'middle', 'bottom', 'baseline', 'text-top', 'text-bottom', 'sub', 'super']) {
    classes.push({ label: `align-${v}` })
  }

  // Transitions & Animation
  // Transition property
  for (const v of ['', 'all', 'colors', 'opacity', 'shadow', 'transform', 'none']) {
    classes.push({ label: `transition${v ? `-${v}` : ''}` })
  }
  // Duration
  for (const v of [0, 75, 100, 150, 200, 300, 500, 700, 1000]) {
    classes.push({ label: `duration-${v}` })
  }
  // Timing function
  for (const v of ['linear', 'in', 'out', 'in-out']) {
    classes.push({ label: `ease-${v}` })
  }
  // Delay
  for (const v of [0, 75, 100, 150, 200, 300, 500, 700, 1000]) {
    classes.push({ label: `delay-${v}` })
  }
  // Animation
  for (const v of ['none', 'spin', 'ping', 'pulse', 'bounce']) {
    classes.push({ label: `animate-${v}` })
  }

  // Transforms
  // Scale
  for (const v of [0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200]) {
    classes.push({ label: `scale-${v}` })
    classes.push({ label: `scale-x-${v}` })
    classes.push({ label: `scale-y-${v}` })
  }
  // Rotate
  for (const v of [0, 1, 2, 3, 6, 12, 45, 90, 180]) {
    classes.push({ label: `rotate-${v}` })
    classes.push({ label: `-rotate-${v}` })
  }
  // Translate
  for (const s of [...SPACING, ...FRACTION_SIZES]) {
    classes.push({ label: `translate-x-${s}` })
    classes.push({ label: `translate-y-${s}` })
    classes.push({ label: `-translate-x-${s}` })
    classes.push({ label: `-translate-y-${s}` })
  }
  // Skew
  for (const v of [0, 1, 2, 3, 6, 12]) {
    classes.push({ label: `skew-x-${v}` })
    classes.push({ label: `skew-y-${v}` })
    classes.push({ label: `-skew-x-${v}` })
    classes.push({ label: `-skew-y-${v}` })
  }
  // Transform origin
  for (const v of ['center', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left']) {
    classes.push({ label: `origin-${v}` })
  }
  classes.push({ label: 'transform-none' }, { label: 'transform-gpu' }, { label: 'transform-cpu' })

  // Interactivity
  // Appearance
  for (const v of ['none', 'auto']) {
    classes.push({ label: `appearance-${v}` })
  }
  // Cursor
  for (const v of ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed', 'none', 'context-menu', 'progress', 'cell', 'crosshair', 'vertical-text', 'alias', 'copy', 'no-drop', 'grab', 'grabbing', 'all-scroll', 'col-resize', 'row-resize', 'n-resize', 's-resize', 'e-resize', 'w-resize', 'ne-resize', 'nw-resize', 'se-resize', 'sw-resize', 'ew-resize', 'ns-resize', 'nwse-resize', 'nesw-resize', 'zoom-in', 'zoom-out']) {
    classes.push({ label: `cursor-${v}` })
  }
  // Caret color
  classes.push(...colorVariants('caret'))
  // Pointer events
  for (const v of ['none', 'auto']) {
    classes.push({ label: `pointer-events-${v}` })
  }
  // Resize
  for (const v of ['none', '', 'y', 'x']) {
    classes.push({ label: `resize${v ? `-${v}` : ''}` })
  }
  // Scroll behavior
  for (const v of ['auto', 'smooth']) {
    classes.push({ label: `scroll-${v}` })
  }
  // Scroll margin/padding
  for (const side of ['', 't', 'r', 'b', 'l', 'x', 'y', 's', 'e']) {
    const d = side ? `-${side}` : ''
    for (const s of SPACING) {
      classes.push({ label: `scroll-m${d}-${s}` })
      classes.push({ label: `scroll-p${d}-${s}` })
    }
  }
  // Snap
  for (const v of ['start', 'end', 'center', 'align-none']) {
    classes.push({ label: `snap-${v}` })
  }
  for (const v of ['mandatory', 'proximity', 'none']) {
    classes.push({ label: `snap-${v}` })
  }
  for (const v of ['normal', 'always']) {
    classes.push({ label: `snap-stop-${v}` })
  }
  for (const v of ['x', 'y', 'both', 'none']) {
    classes.push({ label: `snap-${v}` })
  }
  // Touch action
  for (const v of ['auto', 'none', 'pan-x', 'pan-left', 'pan-right', 'pan-y', 'pan-up', 'pan-down', 'pinch-zoom', 'manipulation']) {
    classes.push({ label: `touch-${v}` })
  }
  // User select
  for (const v of ['none', 'text', 'all', 'auto']) {
    classes.push({ label: `select-${v}` })
  }
  // Will change
  for (const v of ['auto', 'scroll', 'contents', 'transform']) {
    classes.push({ label: `will-change-${v}` })
  }

  // SVG
  classes.push(...colorVariants('fill'))
  classes.push(...colorVariants('stroke'))
  for (const v of [0, 1, 2]) {
    classes.push({ label: `stroke-${v}` })
  }

  // Accessibility
  classes.push({ label: 'sr-only' }, { label: 'not-sr-only' })

  // Forced color adjust
  for (const v of ['auto', 'none']) {
    classes.push({ label: `forced-color-adjust-${v}` })
  }

  // Screen reader
  classes.push({ label: 'sr-only' }, { label: 'not-sr-only' })

  // Aspect ratio
  for (const v of ['auto', 'square', 'video', '16/9', '4/3', '21/9']) {
    classes.push({ label: `aspect-${v}` })
  }

  // Columns
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    classes.push({ label: `columns-${n}` })
  }
  for (const v of ['auto', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl']) {
    classes.push({ label: `columns-${v}` })
  }

  // Break before/after/inside
  for (const v of ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column']) {
    classes.push({ label: `break-before-${v}` })
    classes.push({ label: `break-after-${v}` })
  }
  for (const v of ['auto', 'avoid', 'avoid-page', 'avoid-column']) {
    classes.push({ label: `break-inside-${v}` })
  }

  // Box decoration break
  for (const v of ['clone', 'slice']) {
    classes.push({ label: `decoration-${v}` })
  }

  // Box sizing
  classes.push({ label: 'box-border' }, { label: 'box-content' })

  // Container
  classes.push({ label: 'container' })

  // Deduplicate
  const seen = new Set<string>()
  return classes.filter(({ label }) => {
    if (seen.has(label))
      return false
    seen.add(label)
    return true
  })
}

/** Full list of Tailwind v4 utility classes for completion. */
export const TAILWIND_CLASSES: TailwindClass[] = generate()
