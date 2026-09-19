import { describe, expect, it } from 'vitest'
import {
  findWordAtPoint,
  measurePageLayout,
  mergeRectsByLine,
  type Rect,
  roundedRectsPath,
  sliceByItem,
} from '@/core/rects'
import { buildPageTextModel } from '@/core/text-model'

describe('rectangle helpers', () => {
  it('merges fragments on the same visual line', () => {
    expect(
      mergeRectsByLine([
        { x: 24, y: 10, width: 20, height: 12 },
        { x: 10, y: 11, width: 10, height: 12 },
        { x: 10, y: 30, width: 30, height: 12 },
      ]),
    ).toEqual([
      { x: 10, y: 10, width: 34, height: 13 },
      { x: 10, y: 30, width: 30, height: 12 },
    ])
  })

  it('creates one SVG path value for all line rectangles', () => {
    const path = roundedRectsPath([{ x: 10, y: 20, width: 30, height: 10 }], 2, 4)

    expect(path).toContain('M 12 18')
    expect(path).toContain('Z')
  })
})

describe('sliceByItem', () => {
  it('splits a range into per-item runs and skips inserted separators', () => {
    const model = buildPageTextModel([
      { str: 'first line', hasEOL: true },
      { str: 'second', hasEOL: false },
    ])

    expect(sliceByItem(model, model.text.indexOf('line'), model.text.length)).toEqual([
      { itemIndex: 0, start: 6, end: 10 },
      { itemIndex: 1, start: 0, end: 6 },
    ])
  })
})

describe('measurePageLayout', () => {
  it('measures every word and sentence with the strategy', () => {
    const model = buildPageTextModel([{ str: 'One two. Three.', hasEOL: false }])
    const layout = measurePageLayout(model, {
      getRects: (start, end) => [{ x: start, y: 0, width: end - start, height: 10 }],
    })

    expect(layout.words.map(rects => rects[0]?.x)).toEqual([0, 4, 9])
    expect(layout.sentences).toHaveLength(2)
  })
})

describe('findWordAtPoint', () => {
  const words: Rect[][] = [
    [{ x: 0, y: 0, width: 30, height: 10 }],
    [{ x: 36, y: 0, width: 30, height: 10 }],
    [
      { x: 70, y: 0, width: 20, height: 10 },
      { x: 0, y: 14, width: 20, height: 10 },
    ],
  ]

  it('returns the word under the point', () => {
    expect(findWordAtPoint(words, { x: 40, y: 5 })).toBe(1)
    expect(findWordAtPoint(words, { x: 5, y: 20 })).toBe(2)
  })

  it('snaps to the closest word within the tolerance', () => {
    expect(findWordAtPoint(words, { x: 32, y: 5 })).toBe(0)
    expect(findWordAtPoint(words, { x: 5, y: 40 })).toBeNull()
  })
})
