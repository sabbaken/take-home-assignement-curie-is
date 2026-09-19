import type { TextItem, TextStyle } from 'pdfjs-dist/types/src/display/api'
import { describe, expect, it } from 'vitest'
import { type FontMeasurer, PreciseRectStrategy } from '@/core/precise-rects'
import type { SliceRectSource } from '@/core/rects'
import { buildPageTextModel } from '@/core/text-model'

// Scale 2 on a page 100 units high: page point (x, y) lands on pixel (2x, 200 − 2y).
const VIEWPORT_TRANSFORM = [2, 0, 0, -2, 0, 200]

const STYLES: Record<string, TextStyle> = {
  embedded: { fontFamily: 'serif', ascent: 0.75, descent: -0.25, vertical: false },
  type3: { fontFamily: 'serif', ascent: 0.75, descent: -0.25, vertical: false },
}

// A proportional font: `i` is narrow, `m` is wide and everything else is in between. Only the
// embedded font can be measured, like a Type3 font that has no `FontFace`.
const GLYPH_WIDTHS: Record<string, number> = { i: 1, m: 3 }
const measurer: FontMeasurer = {
  measurePrefixes: (text, fontName) =>
    fontName === 'embedded'
      ? Array.from({ length: text.length + 1 }, (_, index) =>
          Array.from(text.slice(0, index)).reduce(
            (sum, character) => sum + (GLYPH_WIDTHS[character] ?? 2),
            0,
          ),
        )
      : null,
}

// Marks fallback rects so the tests can tell them apart.
const fallback: SliceRectSource = {
  getSliceRects: slice => [
    { x: slice.start, y: -1, width: slice.end - slice.start, height: slice.itemIndex },
  ],
}

// Font size 10 at (20, 80) in page units: baseline at (40, 40) in pixels, 20px text.
function textItem(str: string, fields: Partial<TextItem> = {}): TextItem {
  return {
    str,
    dir: 'ltr',
    transform: [10, 0, 0, 10, 20, 80],
    width: 30,
    height: 10,
    fontName: 'embedded',
    hasEOL: false,
    ...fields,
  }
}

function createStrategy(items: TextItem[]) {
  const model = buildPageTextModel(items)
  return {
    model,
    strategy: new PreciseRectStrategy(model, STYLES, VIEWPORT_TRANSFORM, fallback, measurer),
  }
}

describe('PreciseRectStrategy', () => {
  it('places a word by glyph widths scaled to the item width', () => {
    // `mini ` is 9 units and `hat` 6, 15 in total, spread over 30 × 2 = 60px: 4px per unit.
    const { model, strategy } = createStrategy([textItem('mini hat')])
    const start = model.text.indexOf('hat')

    expect(strategy.getRects(start, start + 3)).toEqual([{ x: 76, y: 25, width: 24, height: 20 }])
  })

  it('uses a default ascent and descent when the font reports none', () => {
    const strategy = new PreciseRectStrategy(
      buildPageTextModel([textItem('mini')]),
      { embedded: { fontFamily: 'serif', ascent: 0, descent: 0, vertical: false } },
      VIEWPORT_TRANSFORM,
      fallback,
      measurer,
    )

    // Ascent 0.8 and descent −0.2 of 20px.
    expect(strategy.getRects(0, 4)).toEqual([{ x: 40, y: 24, width: 60, height: 20 }])
  })

  it('falls back per item for fonts it cannot measure and for rotated text', () => {
    const { model, strategy } = createStrategy([
      textItem('mini', { hasEOL: true }),
      textItem('hat', { fontName: 'type3', hasEOL: true }),
      textItem('tim', { transform: [0, 10, -10, 0, 20, 80] }),
    ])
    const hat = model.text.indexOf('hat')
    const tim = model.text.indexOf('tim')

    expect(strategy.getRects(0, 4)).toEqual([{ x: 40, y: 25, width: 60, height: 20 }])
    expect(strategy.getRects(hat, hat + 3)).toEqual([{ x: 0, y: -1, width: 3, height: 1 }])
    expect(strategy.getRects(tim, tim + 3)).toEqual([{ x: 0, y: -1, width: 3, height: 2 }])
  })

  it('merges items on the same line into one box', () => {
    const { model, strategy } = createStrategy([
      textItem('mini ', { width: 18 }),
      textItem('hat', { transform: [10, 0, 0, 10, 29, 80], width: 12 }),
    ])

    expect(strategy.getRects(0, model.text.length)).toEqual([
      { x: 40, y: 25, width: 42, height: 20 },
    ])
  })
})
