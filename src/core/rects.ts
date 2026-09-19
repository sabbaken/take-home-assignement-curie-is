import type { PageTextModel } from '@/core/text-model'

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export interface RectStrategy {
  getRects(start: number, end: number): Rect[]
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

function findMappedCharacter(model: PageTextModel, start: number, end: number, fromEnd = false) {
  if (fromEnd) {
    for (let index = end - 1; index >= start; index -= 1) {
      const source = model.characterSources[index]
      if (source !== null && source !== undefined) {
        return source
      }
    }
    return null
  }

  for (let index = start; index < end; index += 1) {
    const source = model.characterSources[index]
    if (source !== null && source !== undefined) {
      return source
    }
  }
  return null
}

export class NaiveRectStrategy implements RectStrategy {
  constructor(
    private readonly model: PageTextModel,
    private readonly textDivs: HTMLElement[],
    private readonly container: HTMLElement,
  ) {}

  getRects(start: number, end: number) {
    const first = findMappedCharacter(this.model, start, end)
    const last = findMappedCharacter(this.model, start, end, true)

    if (first === null || last === null) {
      return []
    }

    const firstNode = this.textDivs[first.itemIndex]?.firstChild
    const lastNode = this.textDivs[last.itemIndex]?.firstChild

    if (!(firstNode instanceof Text) || !(lastNode instanceof Text)) {
      return []
    }

    const range = document.createRange()
    range.setStart(firstNode, Math.min(first.offset, firstNode.length))
    range.setEnd(lastNode, Math.min(last.offset + 1, lastNode.length))

    const containerRect = this.container.getBoundingClientRect()
    const rects = Array.from(range.getClientRects(), rect => ({
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    })).filter(rect => rect.width > 0 && rect.height > 0)

    range.detach()
    return mergeRectsByLine(rects)
  }
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
