import { Util } from 'pdfjs-dist'
import type { TextItem, TextStyle } from 'pdfjs-dist/types/src/display/api'
import {
  type ItemSlice,
  mergeRectsByLine,
  type Rect,
  type RectStrategy,
  type SliceRectSource,
  sliceByItem,
} from '@/core/rects'
import type { PageTextModel } from '@/core/text-model'

// `[a, b, c, d, e, f]`, as PDF.js uses it. `Util.transform` is typed `any[]`.
type Matrix = [number, number, number, number, number, number]

// The widths are scaled to the item width afterwards, so only their proportions matter. A large
// fixed size keeps them free of pixel rounding at small zoom levels, and the same at every zoom.
const REFERENCE_FONT_SIZE = 100
// For fonts that report no vertical metrics.
const DEFAULT_ASCENT = 0.8
const DEFAULT_DESCENT = -0.2
// A baseline tilted by more than this, in radians, is rotated text, which is out of scope.
const MAX_BASELINE_ANGLE = 0.01

export interface FontMeasurer {
  // Widths of `text.slice(0, i)` for every `i` from 0 to `text.length`, set in the embedded font
  // `fontName`, or null when that font cannot be measured.
  measurePrefixes(text: string, fontName: string): number[] | null
}

// Where one item's characters lie, in pixels relative to the page.
type ItemGeometry = {
  top: number
  height: number
  // `offsets[i]` is the left edge of character `i`, and `offsets[str.length]` the item's right edge.
  offsets: number[]
}

function unquote(family: string) {
  return family.replace(/^["']|["']$/gu, '')
}

// PDF.js registers every embedded font it draws on the canvas as a `FontFace` whose family is the
// item's `fontName`. Type3 fonts are drawn as paths and fonts missing from the file are drawn in a
// generic family, so neither has a face. `document.fonts.check()` alone is not enough, because it
// also returns true for a family that is not in the set at all.
function isFontLoaded(fontFaces: FontFaceSet, fontName: string) {
  for (const face of fontFaces) {
    if (unquote(face.family) === fontName) {
      return face.status === 'loaded'
    }
  }
  return false
}

export function createCanvasFontMeasurer(fontFaces: FontFaceSet = document.fonts): FontMeasurer {
  const context = document.createElement('canvas').getContext('2d')
  const loadedFonts = new Map<string, boolean>()

  return {
    measurePrefixes(text, fontName) {
      let isLoaded = loadedFonts.get(fontName)
      if (isLoaded === undefined) {
        isLoaded = isFontLoaded(fontFaces, fontName)
        loadedFonts.set(fontName, isLoaded)
      }
      if (context === null || !isLoaded) {
        return null
      }

      context.font = `${REFERENCE_FONT_SIZE}px "${fontName}"`
      // Prefixes rather than single characters, so kerning and shaping between neighbours count.
      // PDF.js drops the font's kerning tables when it repacks the font, so today this matches the
      // sum of the glyph advances. Kerning written into the PDF itself is part of `item.width`.
      return Array.from(
        { length: text.length + 1 },
        (_, index) => context.measureText(text.slice(0, index)).width,
      )
    },
  }
}

function measureItem(
  item: TextItem,
  style: TextStyle | undefined,
  viewportTransform: number[],
  measurer: FontMeasurer,
): ItemGeometry | null {
  // Right-to-left and vertical text are out of scope, like rotated text below.
  if (item.dir !== 'ltr' || style === undefined || style.vertical || !(item.width > 0)) {
    return null
  }

  // Maps the item's text space to page pixels. The origin is the start of the baseline.
  const [a, b, c, d, originX, baseline] = Util.transform(
    viewportTransform,
    item.transform,
  ) as Matrix
  if (Math.abs(Math.atan2(b, a)) > MAX_BASELINE_ANGLE) {
    return null
  }

  const prefixWidths = measurer.measurePrefixes(item.str, item.fontName)
  const measuredWidth = prefixWidths?.at(-1)
  if (prefixWidths === null || measuredWidth === undefined || !(measuredWidth > 0)) {
    return null
  }

  // `item.width` is in page units, like the viewport transform's input.
  const width = item.width * Math.hypot(viewportTransform[0] ?? 0, viewportTransform[1] ?? 0)
  const widthScale = width / measuredWidth
  const fontSize = Math.hypot(c, d)
  const ascent = style.ascent > 0 ? style.ascent : DEFAULT_ASCENT
  const descent = style.descent < 0 ? style.descent : DEFAULT_DESCENT

  return {
    top: baseline - ascent * fontSize,
    height: (ascent - descent) * fontSize,
    offsets: prefixWidths.map(prefixWidth => originX + prefixWidth * widthScale),
  }
}

// Places characters by the metrics of the embedded font that PDF.js drew them with, instead of
// the fallback font of the TextLayer spans. The item transform gives the baseline and font size,
// the font's ascent and descent give the height, and prefix widths give the horizontal offsets,
// scaled so the item spans exactly its real width. Items it cannot measure use `fallback`.
export class PreciseRectStrategy implements RectStrategy {
  // `null` marks an item that falls back.
  private readonly geometries = new Map<number, ItemGeometry | null>()

  constructor(
    private readonly model: PageTextModel<TextItem>,
    private readonly styles: Record<string, TextStyle>,
    private readonly viewportTransform: number[],
    private readonly fallback: SliceRectSource,
    private readonly measurer: FontMeasurer = createCanvasFontMeasurer(),
  ) {}

  getRects(start: number, end: number) {
    return mergeRectsByLine(
      sliceByItem(this.model, start, end).flatMap(slice => this.getSliceRects(slice)),
    )
  }

  private getSliceRects(slice: ItemSlice): Rect[] {
    const geometry = this.getGeometry(slice.itemIndex)
    if (geometry === null) {
      return this.fallback.getSliceRects(slice)
    }

    const left = geometry.offsets[slice.start]
    const right = geometry.offsets[slice.end]
    if (left === undefined || right === undefined || !(right > left)) {
      return []
    }

    return [{ x: left, y: geometry.top, width: right - left, height: geometry.height }]
  }

  private getGeometry(itemIndex: number) {
    let geometry = this.geometries.get(itemIndex)
    if (geometry === undefined) {
      const item = this.model.items[itemIndex]
      geometry =
        item === undefined
          ? null
          : measureItem(item, this.styles[item.fontName], this.viewportTransform, this.measurer)
      this.geometries.set(itemIndex, geometry)
    }
    return geometry
  }
}
