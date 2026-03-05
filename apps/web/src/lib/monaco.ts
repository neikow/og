/**
 * Monaco Editor configuration for TypeScript/JSX with Satori CSS hints,
 * Tailwind CSS class completions, and React type injection.
 *
 * Sets up workers, compiler options, injects type definitions, and registers
 * a Tailwind completion provider for className/class attributes.
 */
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { TAILWIND_CLASSES } from './tailwindClasses'

globalThis.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new TsWorker()
    }
    return new EditorWorker()
  },
}

loader.config({ monaco })

// ─── React type definitions ───────────────────────────────────────────────────
// Self-contained React + JSX type stubs injected into Monaco's virtual TS FS.
// We don't load the full @types/react (195 KB + dependencies) — instead we
// provide a focused declaration covering what template authors actually need:
//   • JSX intrinsic elements (div, span, img, …) with HTML attributes
//   • React hooks (useState, useEffect, …)
//   • React.FC, React.ReactNode, React.CSSProperties, etc.

const REACT_DTS = `
declare namespace React {
  type Key = string | number | bigint;
  type ReactText = string | number;
  type ReactChild = ReactElement | string | number;
  type ReactFragment = {} | Iterable<ReactNode>;
  type ReactPortal = ReactElement & { key: Key | null; children: ReactNode };
  type ReactNode =
    | ReactChild
    | ReactFragment
    | ReactPortal
    | boolean
    | null
    | undefined;

  interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  interface ReactElement<
    P = any,
    T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>
  > {
    type: T;
    props: P;
    key: Key | null;
  }

  type JSXElementConstructor<P> =
    | ((props: P, deprecatedLegacyContext?: any) => ReactNode)
    | (new (props: P, deprecatedLegacyContext?: any) => Component<any, any>);

  interface Component<P = {}, S = {}, SS = any> {}

  type FC<P = {}> = FunctionComponent<P>;
  interface FunctionComponent<P = {}> {
    (props: P): ReactNode;
    displayName?: string;
  }

  type PropsWithChildren<P = unknown> = P & { children?: ReactNode };
  type PropsWithRef<P> = P & { ref?: Ref<any> };

  type Ref<T> = RefCallback<T> | RefObject<T> | null;
  type RefCallback<T> = (instance: T | null) => void;
  interface RefObject<T> { readonly current: T | null; }
  function createRef<T>(): RefObject<T>;

  interface MutableRefObject<T> { current: T; }

  // Hooks
  function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  function useEffect(effect: EffectCallback, deps?: DependencyList): void;
  function useLayoutEffect(effect: EffectCallback, deps?: DependencyList): void;
  function useRef<T>(initialValue: T): MutableRefObject<T>;
  function useRef<T>(initialValue: T | null): RefObject<T>;
  function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  function useCallback<T extends Function>(callback: T, deps: DependencyList): T;
  function useMemo<T>(factory: () => T, deps: DependencyList | undefined): T;
  function useContext<T>(context: Context<T>): T;
  function useReducer<R extends Reducer<any, any>>(reducer: R, initialState: ReducerState<R>): [ReducerState<R>, Dispatch<ReducerAction<R>>];
  function useId(): string;

  type EffectCallback = () => (void | (() => void | undefined));
  type DependencyList = readonly unknown[];
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prevState: S) => S);
  type Reducer<S, A> = (prevState: S, action: A) => S;
  type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
  interface Context<T> { Provider: Provider<T>; Consumer: Consumer<T>; displayName?: string; }
  interface Provider<T> { (props: { value: T; children?: ReactNode }): ReactElement | null; }
  interface Consumer<T> { (props: { children: (value: T) => ReactNode }): ReactElement | null; }
  function createContext<T>(defaultValue: T): Context<T>;

  // Fragment, forwardRef, memo
  const Fragment: symbol;
  function forwardRef<T, P = {}>(render: ForwardRefRenderFunction<T, P>): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>>;
  interface ForwardRefRenderFunction<T, P = {}> { (props: P, ref: ForwardedRef<T>): ReactElement | null; }
  type ForwardedRef<T> = ((instance: T | null) => void) | MutableRefObject<T | null> | null;
  interface ForwardRefExoticComponent<P> { (props: P): ReactElement | null; displayName?: string; }
  type PropsWithoutRef<P> = P extends any ? ('ref' extends keyof P ? Omit<P, 'ref'> : P) : P;
  interface RefAttributes<T> { ref?: Ref<T>; }
  function memo<T extends ComponentType<any>>(type: T): T;
  type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
  interface ComponentClass<P = {}, S = {}> { new(props: P): Component<P, S>; }

  // cloneElement, createElement, children
  function createElement(type: any, props?: any, ...children: ReactNode[]): ReactElement;
  function cloneElement(element: ReactElement, props?: any, ...children: ReactNode[]): ReactElement;
  const Children: {
    map<T, C>(children: ReactNode, fn: (child: C, index: number) => T): T[];
    forEach(children: ReactNode, fn: (child: ReactNode, index: number) => void): void;
    count(children: ReactNode): number;
    only(children: ReactNode): ReactElement;
    toArray(children: ReactNode): ReactNode[];
  };

  // Suspense / lazy
  function lazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>): T;
  interface SuspenseProps { fallback?: ReactNode; children?: ReactNode; }
  const Suspense: ComponentType<SuspenseProps>;

  // Events
  interface SyntheticEvent<T = Element, E = Event> {
    bubbles: boolean; cancelable: boolean; currentTarget: EventTarget & T;
    defaultPrevented: boolean; eventPhase: number; isTrusted: boolean;
    nativeEvent: E; preventDefault(): void; stopPropagation(): void;
    target: EventTarget & T; timeStamp: number; type: string;
    isPropagationStopped(): boolean; isDefaultPrevented(): boolean; persist(): void;
  }
  interface ChangeEvent<T = Element> extends SyntheticEvent<T, Event> { target: EventTarget & T & { value: any }; }
  interface MouseEvent<T = Element> extends SyntheticEvent<T, Event> { clientX: number; clientY: number; button: number; }
  interface KeyboardEvent<T = Element> extends SyntheticEvent<T, Event> { key: string; code: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; }
  interface FocusEvent<T = Element> extends SyntheticEvent<T, Event> { relatedTarget: EventTarget | null; }
  interface FormEvent<T = Element> extends SyntheticEvent<T, Event> {}
  interface TouchEvent<T = Element> extends SyntheticEvent<T, Event> {}
  interface PointerEvent<T = Element> extends SyntheticEvent<T, Event> { clientX: number; clientY: number; }
  interface WheelEvent<T = Element> extends SyntheticEvent<T, Event> { deltaX: number; deltaY: number; deltaZ: number; }
  type EventHandler<E extends SyntheticEvent<any>> = (event: E) => void;
  type ReactEventHandler<T = Element> = EventHandler<SyntheticEvent<T>>;
  type ChangeEventHandler<T = Element> = EventHandler<ChangeEvent<T>>;
  type MouseEventHandler<T = Element> = EventHandler<MouseEvent<T>>;
  type KeyboardEventHandler<T = Element> = EventHandler<KeyboardEvent<T>>;
  type FormEventHandler<T = Element> = EventHandler<FormEvent<T>>;
  type FocusEventHandler<T = Element> = EventHandler<FocusEvent<T>>;
  type TouchEventHandler<T = Element> = EventHandler<TouchEvent<T>>;
  type PointerEventHandler<T = Element> = EventHandler<PointerEvent<T>>;
  type WheelEventHandler<T = Element> = EventHandler<WheelEvent<T>>;
}

// Module augmentation for react package
declare module 'react' {
  export = React;
}

// JSX namespace (for ReactJSX transform)
declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: React.Key): React.ReactElement;
  export function jsxs(type: any, props: any, key?: React.Key): React.ReactElement;
  export const Fragment: symbol;
  export namespace JSX {
    type Element = React.ReactElement;
    type ElementType = string | React.JSXElementConstructor<any>;
    interface ElementClass extends React.Component<any> {}
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }
    interface IntrinsicAttributes { key?: React.Key | null; }
    interface IntrinsicClassAttributes<T> {}
    interface IntrinsicElements {
      // HTML elements
      a: HTMLAttributes & { href?: string; target?: string; rel?: string; download?: string; };
      abbr: HTMLAttributes;
      address: HTMLAttributes;
      area: HTMLAttributes & { href?: string; alt?: string; target?: string; };
      article: HTMLAttributes;
      aside: HTMLAttributes;
      audio: HTMLAttributes & { src?: string; autoPlay?: boolean; controls?: boolean; loop?: boolean; muted?: boolean; };
      b: HTMLAttributes;
      base: HTMLAttributes & { href?: string; target?: string; };
      bdi: HTMLAttributes;
      bdo: HTMLAttributes;
      blockquote: HTMLAttributes & { cite?: string; };
      body: HTMLAttributes;
      br: HTMLAttributes;
      button: HTMLAttributes & { disabled?: boolean; form?: string; name?: string; type?: 'button' | 'submit' | 'reset'; value?: string; };
      canvas: HTMLAttributes & { height?: number | string; width?: number | string; };
      caption: HTMLAttributes;
      cite: HTMLAttributes;
      code: HTMLAttributes;
      col: HTMLAttributes;
      colgroup: HTMLAttributes;
      data: HTMLAttributes & { value?: string; };
      datalist: HTMLAttributes;
      dd: HTMLAttributes;
      del: HTMLAttributes;
      details: HTMLAttributes & { open?: boolean; };
      dfn: HTMLAttributes;
      dialog: HTMLAttributes & { open?: boolean; };
      div: HTMLAttributes;
      dl: HTMLAttributes;
      dt: HTMLAttributes;
      em: HTMLAttributes;
      embed: HTMLAttributes & { height?: number | string; src?: string; type?: string; width?: number | string; };
      fieldset: HTMLAttributes & { disabled?: boolean; form?: string; name?: string; };
      figcaption: HTMLAttributes;
      figure: HTMLAttributes;
      footer: HTMLAttributes;
      form: HTMLAttributes & { action?: string; method?: string; onSubmit?: React.FormEventHandler<HTMLFormElement>; };
      h1: HTMLAttributes;
      h2: HTMLAttributes;
      h3: HTMLAttributes;
      h4: HTMLAttributes;
      h5: HTMLAttributes;
      h6: HTMLAttributes;
      head: HTMLAttributes;
      header: HTMLAttributes;
      hgroup: HTMLAttributes;
      hr: HTMLAttributes;
      html: HTMLAttributes;
      i: HTMLAttributes;
      iframe: HTMLAttributes & { height?: number | string; name?: string; src?: string; width?: number | string; };
      img: HTMLAttributes & { alt?: string; height?: number | string; src?: string; srcSet?: string; width?: number | string; loading?: 'eager' | 'lazy'; };
      input: HTMLAttributes & { checked?: boolean; defaultChecked?: boolean; defaultValue?: string; disabled?: boolean; max?: number | string; maxLength?: number; min?: number | string; minLength?: number; multiple?: boolean; name?: string; placeholder?: string; readOnly?: boolean; required?: boolean; step?: number | string; type?: string; value?: string | number; onChange?: React.ChangeEventHandler<HTMLInputElement>; };
      ins: HTMLAttributes;
      kbd: HTMLAttributes;
      label: HTMLAttributes & { form?: string; htmlFor?: string; };
      legend: HTMLAttributes;
      li: HTMLAttributes & { value?: number; };
      link: HTMLAttributes & { href?: string; rel?: string; type?: string; };
      main: HTMLAttributes;
      map: HTMLAttributes & { name?: string; };
      mark: HTMLAttributes;
      menu: HTMLAttributes;
      meta: HTMLAttributes & { charset?: string; content?: string; name?: string; };
      meter: HTMLAttributes & { high?: number; low?: number; max?: number | string; min?: number | string; optimum?: number; value?: number | string; };
      nav: HTMLAttributes;
      noscript: HTMLAttributes;
      object: HTMLAttributes & { data?: string; height?: number | string; name?: string; type?: string; width?: number | string; };
      ol: HTMLAttributes & { reversed?: boolean; start?: number; type?: '1' | 'a' | 'A' | 'i' | 'I'; };
      optgroup: HTMLAttributes & { disabled?: boolean; label?: string; };
      option: HTMLAttributes & { disabled?: boolean; label?: string; selected?: boolean; value?: string | number; };
      output: HTMLAttributes;
      p: HTMLAttributes;
      picture: HTMLAttributes;
      pre: HTMLAttributes;
      progress: HTMLAttributes & { max?: number | string; value?: number | string; };
      q: HTMLAttributes & { cite?: string; };
      rp: HTMLAttributes;
      rt: HTMLAttributes;
      ruby: HTMLAttributes;
      s: HTMLAttributes;
      samp: HTMLAttributes;
      script: HTMLAttributes & { async?: boolean; src?: string; type?: string; };
      section: HTMLAttributes;
      select: HTMLAttributes & { disabled?: boolean; multiple?: boolean; name?: string; required?: boolean; size?: number; value?: string | number; onChange?: React.ChangeEventHandler<HTMLSelectElement>; };
      slot: HTMLAttributes & { name?: string; };
      small: HTMLAttributes;
      source: HTMLAttributes & { media?: string; src?: string; srcSet?: string; type?: string; };
      span: HTMLAttributes;
      strong: HTMLAttributes;
      style: HTMLAttributes & { media?: string; };
      sub: HTMLAttributes;
      summary: HTMLAttributes;
      sup: HTMLAttributes;
      table: HTMLAttributes;
      tbody: HTMLAttributes;
      td: HTMLAttributes & { colSpan?: number; headers?: string; rowSpan?: number; };
      template: HTMLAttributes;
      textarea: HTMLAttributes & { cols?: number; defaultValue?: string; disabled?: boolean; maxLength?: number; minLength?: number; name?: string; placeholder?: string; readOnly?: boolean; required?: boolean; rows?: number; value?: string; wrap?: string; onChange?: React.ChangeEventHandler<HTMLTextAreaElement>; };
      tfoot: HTMLAttributes;
      th: HTMLAttributes & { colSpan?: number; headers?: string; rowSpan?: number; scope?: string; };
      thead: HTMLAttributes;
      time: HTMLAttributes & { dateTime?: string; };
      title: HTMLAttributes;
      tr: HTMLAttributes;
      track: HTMLAttributes & { default?: boolean; kind?: string; label?: string; src?: string; srcLang?: string; };
      u: HTMLAttributes;
      ul: HTMLAttributes;
      var: HTMLAttributes;
      video: HTMLAttributes & { autoPlay?: boolean; controls?: boolean; height?: number | string; loop?: boolean; muted?: boolean; poster?: string; src?: string; width?: number | string; };
      wbr: HTMLAttributes;
      // SVG elements
      svg: SVGAttributes & { height?: number | string; width?: number | string; viewBox?: string; xmlns?: string; };
      animate: SVGAttributes;
      animateMotion: SVGAttributes;
      animateTransform: SVGAttributes;
      circle: SVGAttributes & { cx?: number | string; cy?: number | string; r?: number | string; };
      clipPath: SVGAttributes & { clipPathUnits?: string; };
      defs: SVGAttributes;
      desc: SVGAttributes;
      ellipse: SVGAttributes & { cx?: number | string; cy?: number | string; rx?: number | string; ry?: number | string; };
      feBlend: SVGAttributes;
      feColorMatrix: SVGAttributes;
      feComponentTransfer: SVGAttributes;
      feComposite: SVGAttributes;
      feConvolveMatrix: SVGAttributes;
      feDiffuseLighting: SVGAttributes;
      feDisplacementMap: SVGAttributes;
      feDistantLight: SVGAttributes;
      feDropShadow: SVGAttributes;
      feFlood: SVGAttributes;
      feFuncA: SVGAttributes;
      feFuncB: SVGAttributes;
      feFuncG: SVGAttributes;
      feFuncR: SVGAttributes;
      feGaussianBlur: SVGAttributes;
      feImage: SVGAttributes;
      feMerge: SVGAttributes;
      feMergeNode: SVGAttributes;
      feMorphology: SVGAttributes;
      feOffset: SVGAttributes;
      fePointLight: SVGAttributes;
      feSpecularLighting: SVGAttributes;
      feSpotLight: SVGAttributes;
      feTile: SVGAttributes;
      feTurbulence: SVGAttributes;
      filter: SVGAttributes;
      foreignObject: SVGAttributes;
      g: SVGAttributes;
      image: SVGAttributes & { height?: number | string; href?: string; width?: number | string; x?: number | string; y?: number | string; };
      line: SVGAttributes & { x1?: number | string; x2?: number | string; y1?: number | string; y2?: number | string; };
      linearGradient: SVGAttributes & { x1?: number | string; x2?: number | string; y1?: number | string; y2?: number | string; };
      marker: SVGAttributes;
      mask: SVGAttributes;
      metadata: SVGAttributes;
      mpath: SVGAttributes;
      path: SVGAttributes & { d?: string; };
      pattern: SVGAttributes;
      polygon: SVGAttributes & { points?: string; };
      polyline: SVGAttributes & { points?: string; };
      radialGradient: SVGAttributes & { cx?: number | string; cy?: number | string; r?: number | string; };
      rect: SVGAttributes & { height?: number | string; rx?: number | string; ry?: number | string; width?: number | string; x?: number | string; y?: number | string; };
      set: SVGAttributes;
      stop: SVGAttributes & { offset?: number | string; };
      switch: SVGAttributes;
      symbol: SVGAttributes;
      text: SVGAttributes & { x?: number | string; y?: number | string; };
      textPath: SVGAttributes;
      tspan: SVGAttributes;
      use: SVGAttributes & { height?: number | string; href?: string; width?: number | string; x?: number | string; y?: number | string; };
      view: SVGAttributes;
    }
  }
}

// Common attribute types used above
interface DOMAttributes {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<any>;
  onDoubleClick?: React.MouseEventHandler<any>;
  onMouseDown?: React.MouseEventHandler<any>;
  onMouseUp?: React.MouseEventHandler<any>;
  onMouseEnter?: React.MouseEventHandler<any>;
  onMouseLeave?: React.MouseEventHandler<any>;
  onMouseMove?: React.MouseEventHandler<any>;
  onKeyDown?: React.KeyboardEventHandler<any>;
  onKeyUp?: React.KeyboardEventHandler<any>;
  onKeyPress?: React.KeyboardEventHandler<any>;
  onFocus?: React.FocusEventHandler<any>;
  onBlur?: React.FocusEventHandler<any>;
  onChange?: React.ChangeEventHandler<any>;
  onInput?: React.FormEventHandler<any>;
  onSubmit?: React.FormEventHandler<any>;
  onReset?: React.FormEventHandler<any>;
  onScroll?: React.UIEventHandler<any>;
  onTouchStart?: React.TouchEventHandler<any>;
  onTouchMove?: React.TouchEventHandler<any>;
  onTouchEnd?: React.TouchEventHandler<any>;
}
type UIEventHandler<T = Element> = React.EventHandler<React.SyntheticEvent<T>>;
declare namespace React { type UIEventHandler<T = Element> = EventHandler<SyntheticEvent<T>>; }

interface HTMLAttributes extends DOMAttributes {
  // Global HTML attributes
  accessKey?: string;
  autoFocus?: boolean;
  className?: string;
  class?: string; // Satori also accepts class=
  contentEditable?: boolean | 'inherit';
  dir?: string;
  draggable?: boolean;
  hidden?: boolean;
  id?: string;
  lang?: string;
  role?: string;
  slot?: string;
  spellCheck?: boolean;
  style?: React.CSSProperties;
  tabIndex?: number;
  title?: string;
  translate?: 'yes' | 'no';
  // ARIA
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-live'?: 'off' | 'assertive' | 'polite';
  'aria-expanded'?: boolean | 'true' | 'false';
  'aria-selected'?: boolean | 'true' | 'false';
  'aria-checked'?: boolean | 'true' | 'false' | 'mixed';
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-readonly'?: boolean | 'true' | 'false';
  'aria-required'?: boolean | 'true' | 'false';
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-atomic'?: boolean | 'true' | 'false';
  'aria-relevant'?: string;
  'aria-placeholder'?: string;
  'aria-roledescription'?: string;
  // Data attributes
  [key: \`data-\${string}\`]: string | number | boolean | undefined;
}

interface SVGAttributes extends DOMAttributes {
  className?: string;
  class?: string;
  id?: string;
  style?: React.CSSProperties;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  opacity?: number | string;
  transform?: string;
  clipPath?: string;
  mask?: string;
  filter?: string;
}
`

// ─── Satori CSS type definitions ──────────────────────────────────────────────

const SATORI_CSS_DTS = `
declare module 'react' {
  interface CSSProperties {
    // Only Flexbox layout is supported (no grid)
    display?: 'flex' | 'none';
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    flex?: number | string;
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    alignItems?: 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline';
    alignContent?: 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
    alignSelf?: 'auto' | 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    gap?: number | string;
    rowGap?: number | string;
    columnGap?: number | string;
    // Sizing
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    minHeight?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    // Position
    position?: 'relative' | 'absolute' | 'static';
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    // Spacing
    margin?: number | string;
    marginTop?: number | string;
    marginRight?: number | string;
    marginBottom?: number | string;
    marginLeft?: number | string;
    padding?: number | string;
    paddingTop?: number | string;
    paddingRight?: number | string;
    paddingBottom?: number | string;
    paddingLeft?: number | string;
    // Border
    border?: string;
    borderWidth?: number | string;
    borderColor?: string;
    borderStyle?: 'solid' | 'dashed';
    borderRadius?: number | string;
    borderTopLeftRadius?: number | string;
    borderTopRightRadius?: number | string;
    borderBottomLeftRadius?: number | string;
    borderBottomRightRadius?: number | string;
    // Color & Background
    color?: string;
    opacity?: number;
    background?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundClip?: 'border-box' | 'padding-box' | 'content-box' | 'text';
    // Typography
    fontFamily?: string;
    fontSize?: number | string;
    fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | string;
    fontStyle?: 'normal' | 'italic';
    lineHeight?: number | string;
    letterSpacing?: number | string;
    textAlign?: 'left' | 'right' | 'center' | 'justify';
    textDecoration?: string;
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
    textOverflow?: 'clip' | 'ellipsis';
    textShadow?: string;
    whiteSpace?: 'normal' | 'pre' | 'pre-wrap' | 'pre-line' | 'nowrap';
    wordBreak?: 'normal' | 'break-all' | 'keep-all' | 'break-word';
    WebkitTextStroke?: string;
    // Effects
    boxShadow?: string;
    filter?: string;
    transform?: string;
    transformOrigin?: string;
    overflow?: 'visible' | 'hidden';
    objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    objectPosition?: string;
    clipPath?: string;
  }
}
export {};
`

// ─── Tailwind completion provider ────────────────────────────────────────────

let tailwindProviderDisposable: monaco.IDisposable | null = null

const ATTRIBUTE_REGEX = /(?:className|class)\s*=\s*(?:["'{`]|\{\s*["'`])([^"'`}]*)$/
const SPACE_REGEX = /\s+/

/**
 * Register a Monaco completion provider that suggests Tailwind CSS classes
 * inside className="..." and class="..." attribute values.
 *
 * Passing an empty `extraClasses` list removes any previously registered
 * provider and re-registers with the base class list.
 */
function registerTailwindCompletions(
  m: typeof monaco,
  extraClasses: string[] = [],
): void {
  // Dispose any previously registered provider
  tailwindProviderDisposable?.dispose()

  const allClasses: Array<{ label: string, detail?: string }> = [
    ...TAILWIND_CLASSES,
    ...extraClasses.map(c => ({ label: c })),
  ]

  tailwindProviderDisposable = m.languages.registerCompletionItemProvider(
    'typescript',
    {
      // Trigger inside string literals
      triggerCharacters: ['"', '\'', ' ', '-'],
      provideCompletionItems(model, position) {
        const lineContent = model.getLineContent(position.lineNumber)
        const colIndex = position.column - 1 // 0-based

        // Walk backwards to find if we're inside a className/class attribute
        const lineUpToCursor = lineContent.slice(0, colIndex)

        // Match className="<prefix> or class="<prefix>
        // and className={'<prefix> / class={'<prefix>
        const attrMatch = lineUpToCursor.match(ATTRIBUTE_REGEX)
        if (!attrMatch)
          return { suggestions: [] }

        // The current word fragment typed after the last space
        const classPrefix = attrMatch[1].split(SPACE_REGEX).pop() ?? ''

        // Find the start of the current word for range replacement
        const wordStart = colIndex - classPrefix.length

        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordStart + 1,
          endColumn: position.column,
        }

        const suggestions: monaco.languages.CompletionItem[] = allClasses.map(
          ({ label, detail }) => ({
            label,
            kind: m.languages.CompletionItemKind.Value,
            detail: detail ?? 'Tailwind CSS',
            insertText: label,
            range,
            sortText: label,
          }),
        )

        return { suggestions }
      },
    },
  )
}

// ─── One-time setup tracking ──────────────────────────────────────────────────

let baseConfigured = false
let galleryProviderDisposable: monaco.IDisposable | null = null

/**
 * Register (or re-register) a Monaco completion provider that suggests
 * Gallery identifiers after typing "Gallery.".
 */
function registerGalleryCompletions(
  m: typeof monaco,
  identifiers: string[],
): void {
  galleryProviderDisposable?.dispose()
  if (identifiers.length === 0)
    return

  galleryProviderDisposable = m.languages.registerCompletionItemProvider(
    'typescript',
    {
      triggerCharacters: ['.'],
      provideCompletionItems(model, position) {
        const lineUpToCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
        if (!lineUpToCursor.endsWith('Gallery.'))
          return { suggestions: [] }

        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column,
        }

        return {
          suggestions: identifiers.map(id => ({
            label: id,
            kind: m.languages.CompletionItemKind.Property,
            detail: 'Gallery image URL',
            insertText: id,
            range,
          })),
        }
      },
    },
  )
}

/**
 * Configure Monaco TypeScript defaults for JSX + Satori CSS hints + React types.
 * Call this once before mounting any editor instances.
 */
export function configureMonaco(
  m: typeof monaco,
  fontFamilies: string[] = [],
  galleryIdentifiers: string[] = [],
) {
  // monaco.languages.typescript is deprecated in 0.55+; use monaco.typescript instead
  const ts = m.typescript

  if (!baseConfigured) {
    baseConfigured = true

    // TypeScript compiler options
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: 'react',
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      // Needed to resolve @types/react
      typeRoots: [],
    })

    ts.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    // Inject React + JSX type stubs into Monaco's virtual FS
    ts.typescriptDefaults.addExtraLib(REACT_DTS, 'file:///node_modules/@types/react/index.d.ts')

    // Inject Satori CSS overrides (must come after react types)
    ts.typescriptDefaults.addExtraLib(SATORI_CSS_DTS, 'file:///satori-css-overrides.d.ts')

    // Register Tailwind class completions
    registerTailwindCompletions(m)
  }

  // Update font family completions whenever selected fonts change
  // (this part runs every time, not just on first config)
  if (fontFamilies.length > 0) {
    const fontUnion = fontFamilies.map(f => `'${f}'`).join(' | ')
    const fontDts = `
import 'react';
declare module 'react' {
  interface CSSProperties {
    fontFamily?: ${fontUnion} | (string & {});
  }
}
export {};
`
    ts.typescriptDefaults.addExtraLib(fontDts, 'file:///font-families.d.ts')
  }

  // Update Gallery global type stub with actual identifiers
  {
    const identifierKeys = galleryIdentifiers.length > 0
      ? galleryIdentifiers.map(id => `  readonly ${id}: string;`).join('\n')
      : '  readonly [key: string]: string;'
    const galleryDts = `declare const Gallery: {\n${identifierKeys}\n};\n`
    ts.typescriptDefaults.addExtraLib(galleryDts, 'file:///gallery-globals.d.ts')
  }

  // Re-register Gallery completion provider with up-to-date identifiers
  registerGalleryCompletions(m, galleryIdentifiers)
}

// ─── CSS editor font-family completion ───────────────────────────────────────

let cssFontProviderDisposable: monaco.IDisposable | null = null

const FONT_FAMILY_TRIGGER_REGEX = /font-family\s*:[^;]*$/
const FONT_CUSTOM_PROP_TRIGGER_REGEX = /--[\w-]*font[\w-]*\s*:[^;]*$/
const WORD_BEFORE_CURSOR_REGEX = /[\w-]+$/

/**
 * Register (or re-register) a Monaco CSS completion provider that suggests
 * font family names:
 *  - after `font-family:` anywhere in the file
 *  - after `--font-*:` custom properties (common Tailwind v4 @theme pattern)
 */
export function configureCssEditor(
  m: typeof monaco,
  fontFamilies: string[],
): void {
  cssFontProviderDisposable?.dispose()
  if (fontFamilies.length === 0)
    return

  cssFontProviderDisposable = m.languages.registerCompletionItemProvider('css', {
    triggerCharacters: [' ', ':'],
    provideCompletionItems(model, position) {
      const lineUpToCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1)

      // Match `font-family:` (with optional spaces) or `--font-*:` custom props
      const isFontFamilyValue = FONT_FAMILY_TRIGGER_REGEX.test(lineUpToCursor)
      const isFontCustomProp = FONT_CUSTOM_PROP_TRIGGER_REGEX.test(lineUpToCursor)

      if (!isFontFamilyValue && !isFontCustomProp)
        return { suggestions: [] }

      // Word currently being typed (for range replacement)
      const wordMatch = lineUpToCursor.match(WORD_BEFORE_CURSOR_REGEX)
      const wordLen = wordMatch ? wordMatch[0].length : 0

      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column - wordLen,
        endColumn: position.column,
      }

      return {
        suggestions: fontFamilies.map(family => ({
          label: family,
          kind: m.languages.CompletionItemKind.Value,
          detail: 'Font family',
          insertText: family,
          range,
        })),
      }
    },
  })
}

export const EDITOR_DEFAULT_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineHeight: 22,
  tabSize: 2,
  wordWrap: 'on',
  automaticLayout: true,
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  formatOnPaste: true,
  formatOnType: false,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'smart',
  theme: 'vs-dark',
}
