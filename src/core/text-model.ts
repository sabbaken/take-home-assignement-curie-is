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

// Generic over the item type, so the precise strategy can read the geometry of PDF.js items.
export type PageTextModel<Item extends PdfTextItem = PdfTextItem> = {
  text: string
  items: Item[]
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

function segmentSentences(text: string, words: TextRange[], locale?: string) {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' })

  return Array.from(segmenter.segment(text)).flatMap(segment => {
    const leadingWhitespace = segment.segment.match(/^\s*/u)?.[0].length ?? 0
    const trailingWhitespace = segment.segment.match(/\s*$/u)?.[0].length ?? 0
    const start = segment.index + leadingWhitespace
    const end = segment.index + segment.segment.length - trailingWhitespace
    // Sentences without words (a lone footnote mark, a dash) have nothing to read or navigate to.
    const hasWords = words.some(word => word.start >= start && word.end <= end)

    return start < end && hasWords ? [{ start, end, text: text.slice(start, end) }] : []
  })
}

function getSeparator(text: string, current: string, pendingBreak: 'line' | 'block' | null) {
  if (text.length === 0 || pendingBreak === null) {
    return ''
  }
  // `Intl.Segmenter` ends a sentence at every `\n`, so only block breaks get one. A wrapped line
  // becomes a space, and a sentence can continue onto the next line.
  if (pendingBreak === 'block') {
    return '\n'
  }
  return /\s$/u.test(text) || /^\s/u.test(current) ? '' : ' '
}

export function buildPageTextModel<Item extends PdfTextItem>(
  sourceItems: Item[],
  locale?: string,
): PageTextModel<Item> {
  const items = sourceItems.filter(item => typeof item.str === 'string')
  const characterSources: Array<CharacterSource | null> = []
  let text = ''
  // PDF.js already emits whitespace items for visual gaps inside a line, so items on the same line
  // are joined as is. `hasEOL` on an item means the line wraps after it. An empty item with
  // `hasEOL` means a new text block starts after it, such as a heading, a new paragraph or a footnote.
  let pendingBreak: 'line' | 'block' | null = null

  items.forEach((item, itemIndex) => {
    if (item.str.length === 0) {
      if (item.hasEOL) {
        pendingBreak = 'block'
      }
      return
    }

    const separator = getSeparator(text, item.str, pendingBreak)
    if (separator !== '') {
      text += separator
      characterSources.push(null)
    }

    // Offsets are UTF-16 code units, which is what `Range`, `String#slice` and speech
    // `charIndex` all use.
    for (let offset = 0; offset < item.str.length; offset += 1) {
      characterSources.push({ itemIndex, offset })
    }
    text += item.str
    pendingBreak = item.hasEOL ? 'line' : null
  })

  const words = segmentWords(text, locale)

  return {
    text,
    items,
    characterSources,
    words,
    sentences: segmentSentences(text, words, locale),
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

export function findSentenceIndexOfWord(model: PageTextModel, wordIndex: number) {
  const word = model.words[wordIndex]
  return word === undefined ? null : findSentenceIndex(model, word.start)
}

// Every sentence contains at least one word, so this word always lies inside the sentence.
export function findFirstWordOfSentence(model: PageTextModel, sentenceIndex: number) {
  const sentence = model.sentences[sentenceIndex]
  return sentence === undefined ? null : findWordIndex(model, sentence.start)
}
