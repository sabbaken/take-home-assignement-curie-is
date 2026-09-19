import type { PageTextModel } from '@/core/text-model'

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type Point = {
  x: number
  y: number
}

export interface RectStrategy {
  getRects(start: number, end: number): Rect[]
}

// Rects of every word and sentence on the page, indexed like `model.words` and `model.sentences`.
export type PageLayout = {
  words: Rect[][]
  sentences: Rect[][]
}

// A run of consecutive characters from one item, as `[start, end)` offsets into its string.
export type ItemSlice = {
  itemIndex: number
  start: number
  end: number
}

function isSameLine(left: Rect, right: Rect) {
  const leftMiddle = left.y + left.height / 2
  const rightMiddle = right.y + right.height / 2
  return Math.abs(leftMiddle - rightMiddle) <= Math.max(2, Math.min(left.height, right.height) / 2)
}

export function mergeRectsByLine(rects: Rect[]) {
  const sorted = [...rects].sort((left, right) => left.y - right.y || left.x - right.x)
  const merged: Rect[] = []

  for (const rect of sorted) {
    const previous = merged.at(-1)

    if (previous !== undefined && isSameLine(previous, rect)) {
      const right = Math.max(previous.x + previous.width, rect.x + rect.width)
      const bottom = Math.max(previous.y + previous.height, rect.y + rect.height)
      previous.x = Math.min(previous.x, rect.x)
      previous.y = Math.min(previous.y, rect.y)
      previous.width = right - previous.x
      previous.height = bottom - previous.y
    } else {
      merged.push({ ...rect })
    }
  }

  return merged
}

// Splits a page text range into per-item runs. Inserted separators have no source and are skipped.
export function sliceByItem(model: PageTextModel, start: number, end: number) {
  const slices: ItemSlice[] = []

  for (let index = start; index < end; index += 1) {
    const source = model.characterSources[index]
    if (source === null || source === undefined) {
      continue
    }

    const last = slices.at(-1)
    if (last !== undefined && last.itemIndex === source.itemIndex && last.end === source.offset) {
      last.end += 1
    } else {
      slices.push({ itemIndex: source.itemIndex, start: source.offset, end: source.offset + 1 })
    }
  }

  return slices
}

// Measures one `Range` per item on the TextLayer spans. PDF.js creates one span for every text
// item, empty ones included, so `textDivs` lines up with `model.items`. The spans use a fallback
// font stretched to the item width, so boxes drift from the glyphs drawn on the canvas.
export class NaiveRectStrategy implements RectStrategy {
  constructor(
    private readonly model: PageTextModel,
    private readonly textDivs: HTMLElement[],
    private readonly container: HTMLElement,
  ) {}

  getRects(start: number, end: number) {
    const containerRect = this.container.getBoundingClientRect()
    const range = document.createRange()
    const rects: Rect[] = []

    for (const slice of sliceByItem(this.model, start, end)) {
      const node = this.textDivs[slice.itemIndex]?.firstChild
      if (!(node instanceof Text)) {
        continue
      }

      range.setStart(node, Math.min(slice.start, node.length))
      range.setEnd(node, Math.min(slice.end, node.length))

      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width > 0 && rect.height > 0) {
          rects.push({
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height,
          })
        }
      }
    }

    return mergeRectsByLine(rects)
  }
}

export function measurePageLayout(model: PageTextModel, strategy: RectStrategy): PageLayout {
  return {
    words: model.words.map(word => strategy.getRects(word.start, word.end)),
    sentences: model.sentences.map(sentence => strategy.getRects(sentence.start, sentence.end)),
  }
}

function distanceToRect(point: Point, rect: Rect) {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width))
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height))
  return Math.hypot(dx, dy)
}

// Returns the word under the point, or the closest one within `tolerance` pixels, so a click in
// the gap between two words still lands on one of them.
export function findWordAtPoint(wordRects: Rect[][], point: Point, tolerance = 4) {
  let closestIndex: number | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const [index, rects] of wordRects.entries()) {
    for (const rect of rects) {
      const distance = distanceToRect(point, rect)
      if (distance < closestDistance) {
        closestIndex = index
        closestDistance = distance
      }
    }
  }

  return closestDistance <= tolerance ? closestIndex : null
}

export function roundedRectsPath(rects: Rect[], padding = 0, radius = 4) {
  return rects
    .map(rect => {
      const x = rect.x - padding
      const y = rect.y - padding
      const width = rect.width + padding * 2
      const height = rect.height + padding * 2
      const safeRadius = Math.min(radius, width / 2, height / 2)

      return [
        `M ${x + safeRadius} ${y}`,
        `H ${x + width - safeRadius}`,
        `Q ${x + width} ${y} ${x + width} ${y + safeRadius}`,
        `V ${y + height - safeRadius}`,
        `Q ${x + width} ${y + height} ${x + width - safeRadius} ${y + height}`,
        `H ${x + safeRadius}`,
        `Q ${x} ${y + height} ${x} ${y + height - safeRadius}`,
        `V ${y + safeRadius}`,
        `Q ${x} ${y} ${x + safeRadius} ${y}`,
        'Z',
      ].join(' ')
    })
    .join(' ')
}
