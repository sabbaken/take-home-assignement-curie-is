import { describe, expect, it } from 'vitest'
import { mergeRectsByLine, roundedRectsPath } from '@/core/rects'

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
