export type PdfTextItem = {
  str: string
  hasEOL: boolean
}

export type CharacterSource = {
  itemIndex: number
  offset: number
}

export type TextRange = {
  start: number
  end: number
  text: string
}

export type PageTextModel = {
  text: string
  items: PdfTextItem[]
  characterSources: Array<CharacterSource | null>
  words: TextRange[]
  sentences: TextRange[]
}

function segmentWords(text: string, locale?: string) {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })

  return Array.from(segmenter.segment(text))
    .filter(segment => segment.isWordLike)
    .map(segment => ({
      start: segment.index,
      end: segment.index + segment.segment.length,
      text: segment.segment,
    }))
}

function segmentSentences(text: string, locale?: string) {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' })

  return Array.from(segmenter.segment(text)).flatMap(segment => {
    const leadingWhitespace = segment.segment.match(/^\s*/u)?.[0].length ?? 0
    const trailingWhitespace = segment.segment.match(/\s*$/u)?.[0].length ?? 0
    const start = segment.index + leadingWhitespace
    const end = segment.index + segment.segment.length - trailingWhitespace

    return start < end ? [{ start, end, text: text.slice(start, end) }] : []
  })
}

function needsSeparator(previous: PdfTextItem | undefined, current: PdfTextItem) {
  if (previous === undefined || previous.str.length === 0 || current.str.length === 0) {
    return false
  }

  return !/\s$/u.test(previous.str) && !/^\s/u.test(current.str)
}

export function buildPageTextModel(sourceItems: PdfTextItem[], locale?: string): PageTextModel {
  const items = sourceItems.filter(item => typeof item.str === 'string')
  const characterSources: Array<CharacterSource | null> = []
  let text = ''

  items.forEach((item, itemIndex) => {
    const previous = items[itemIndex - 1]

    if (needsSeparator(previous, item)) {
      text += previous?.hasEOL ? '\n' : ' '
      characterSources.push(null)
    }

    for (const [offset, character] of Array.from(item.str).entries()) {
      text += character
      characterSources.push({ itemIndex, offset })
    }
  })

  return {
    text,
    items,
    characterSources,
    words: segmentWords(text, locale),
    sentences: segmentSentences(text, locale),
  }
}

export function findWordIndex(model: PageTextModel, characterIndex: number) {
  const containingIndex = model.words.findIndex(
    word => characterIndex >= word.start && characterIndex < word.end,
  )

  if (containingIndex >= 0) {
    return containingIndex
  }

  const nextIndex = model.words.findIndex(word => word.start >= characterIndex)
  return nextIndex >= 0 ? nextIndex : Math.max(0, model.words.length - 1)
}

export function findSentenceIndex(model: PageTextModel, characterIndex: number) {
  const containingIndex = model.sentences.findIndex(
    sentence => characterIndex >= sentence.start && characterIndex < sentence.end,
  )

  if (containingIndex >= 0) {
    return containingIndex
  }

  const nextIndex = model.sentences.findIndex(sentence => sentence.start >= characterIndex)
  return nextIndex >= 0 ? nextIndex : Math.max(0, model.sentences.length - 1)
}
