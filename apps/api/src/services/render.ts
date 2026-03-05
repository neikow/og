import type { Font } from '@og/shared'
import { readFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { preloadImages } from './imagePreload'

export interface FontData {
  font: Font
  data: Buffer
}

export interface RenderOptions {
  width?: number
  height?: number
  /** If set, the output PNG is scaled down to this width (preserving aspect ratio). */
  fitToWidth?: number
}

/**
 * Load font file data from disk for the given font records.
 */
export function loadFontData(fonts: Font[]): FontData[] {
  return fonts.map(font => ({
    font,
    data: readFileSync(font.filePath as unknown as string),
  }))
}

/**
 * Convert a React element tree to a PNG Buffer using Satori → resvg-js.
 */
export async function renderToPng(
  element: React.ReactElement,
  fontDatas: FontData[],
  options: RenderOptions = {},
): Promise<Buffer> {
  const width = options.width ?? 1200
  const height = options.height ?? 630
  const outputWidth = options.fitToWidth ?? width

  // Build satori font list
  const satorifonts = fontDatas.map(({ font, data }) => ({
    name: font.family,
    data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
    weight: font.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
    style: font.style as 'normal' | 'italic',
  }))

  // 1. Pre-fetch all remote images and replace URLs with data: URIs
  const resolvedElement = await preloadImages(element) as React.ReactElement

  // 2. React element → SVG string
  const svg = await satori(resolvedElement, {
    width,
    height,
    fonts: satorifonts,
  })

  // 3. SVG string → PNG Buffer
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: outputWidth },
    font: {
      loadSystemFonts: false,
    },
  })

  return resvg.render().asPng()
}
