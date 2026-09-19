import { describe, expect, it } from 'vitest'
import {
  buildPageTextModel,
  findFirstWordOfSentence,
  findSentenceIndex,
  findSentenceIndexOfWord,
  findWordIndex,
} from '@/core/text-model'

describe('buildPageTextModel', () => {
  it('joins PDF items and keeps a source for every original character', () => {
    const model = buildPageTextModel([
      { str: 'Hello', hasEOL: false },
      { str: ' ', hasEOL: false },
      { str: 'world.', hasEOL: false },
      { str: '', hasEOL: true },
      { str: 'Next sentence!', hasEOL: false },
    ])

    expect(model.text).toBe('Hello world.\nNext sentence!')
    expect(model.characterSources[5]).toEqual({ itemIndex: 1, offset: 0 })
    expect(model.characterSources[12]).toBeNull()
    expect(model.characterSources[13]).toEqual({ itemIndex: 4, offset: 0 })
    expect(model.words.map(word => word.text)).toEqual(['Hello', 'world', 'Next', 'sentence'])
    expect(model.sentences.map(sentence => sentence.text)).toEqual([
      'Hello world.',
      'Next sentence!',
    ])
  })

  it('joins items on the same line without a separator', () => {
    const model = buildPageTextModel([
      { str: 'type-stable', hasEOL: false },
      { str: ', meaning', hasEOL: false },
    ])

    expect(model.text).toBe('type-stable, meaning')
  })

  it('keeps hyphenated words and email addresses in one highlight range', () => {
    const model = buildPageTextModel([
      {
        str: 'A data-rich, user-facing app by name.surname@gmail.com.',
        hasEOL: false,
      },
    ])

    expect(model.words.map(word => word.text)).toEqual([
      'A',
      'data-rich',
      'user-facing',
      'app',
      'by',
      'name.surname@gmail.com',
    ])
  })

  it('supports typographic hyphens without merging ordinary punctuation', () => {
    const model = buildPageTextModel([{ str: 'Jean‑Luc re‐enters—then stops.', hasEOL: false }])

    expect(model.words.map(word => word.text)).toEqual(['Jean‑Luc', 're‐enters', 'then', 'stops'])
  })

  it('keeps full URLs in one highlight range without trailing punctuation', () => {
    const model = buildPageTextModel([
      {
        str: 'Read https://example.com/docs/getting-started?tab=api#usage, or example.org/help/faq.',
        hasEOL: false,
      },
    ])

    expect(model.words.map(word => word.text)).toEqual([
      'Read',
      'https://example.com/docs/getting-started?tab=api#usage',
      'or',
      'example.org/help/faq',
    ])
  })

  it('wraps lines with a space so a sentence continues onto the next line', () => {
    const model = buildPageTextModel([
      { str: 'Dynamic languages are hard', hasEOL: true },
      { str: 'to compile. Since no type', hasEOL: true },
      { str: 'information exists.', hasEOL: false },
    ])

    expect(model.text).toBe(
      'Dynamic languages are hard to compile. Since no type information exists.',
    )
    expect(model.sentences.map(sentence => sentence.text)).toEqual([
      'Dynamic languages are hard to compile.',
      'Since no type information exists.',
    ])
  })

  it('starts a new sentence after a block break, such as a heading', () => {
    const model = buildPageTextModel([
      { str: '', hasEOL: true },
      { str: 'Abstract', hasEOL: false },
      { str: '', hasEOL: true },
      { str: 'Dynamic languages are popular.', hasEOL: false },
    ])

    expect(model.text).toBe('Abstract\nDynamic languages are popular.')
    expect(model.sentences.map(sentence => sentence.text)).toEqual([
      'Abstract',
      'Dynamic languages are popular.',
    ])
  })

  it('drops sentences that contain no words', () => {
    const model = buildPageTextModel([
      { str: 'Mozilla Corporation', hasEOL: false },
      { str: '', hasEOL: true },
      { str: '∗', hasEOL: false },
      { str: '', hasEOL: true },
      { str: 'Adobe Corporation', hasEOL: false },
    ])

    expect(model.sentences.map(sentence => sentence.text)).toEqual([
      'Mozilla Corporation',
      'Adobe Corporation',
    ])
  })

  it('maps characters by UTF-16 code unit, like Range offsets and speech charIndex', () => {
    const model = buildPageTextModel([{ str: 'let 𝑥 be one', hasEOL: false }])

    expect(model.characterSources).toHaveLength(model.text.length)
    const be = model.text.indexOf('be')
    expect(model.characterSources[be]).toEqual({ itemIndex: 0, offset: be })
  })
})

describe('text model lookups', () => {
  const model = buildPageTextModel([{ str: 'One two. Three four.', hasEOL: false }])

  it('locates the active word and sentence from a speech character index', () => {
    expect(findWordIndex(model, model.text.indexOf('two'))).toBe(1)
    expect(findSentenceIndex(model, model.text.indexOf('Three'))).toBe(1)
  })

  it('moves between words and the sentences that contain them', () => {
    expect(findSentenceIndexOfWord(model, 3)).toBe(1)
    expect(findSentenceIndexOfWord(model, 4)).toBeNull()
    expect(findFirstWordOfSentence(model, 1)).toBe(2)
    expect(findFirstWordOfSentence(model, 2)).toBeNull()
  })
})
