import { describe, expect, it } from 'vitest'
import { buildPageTextModel, findSentenceIndex, findWordIndex } from '@/core/text-model'

describe('buildPageTextModel', () => {
  it('joins PDF items and keeps a source for every original character', () => {
    const model = buildPageTextModel([
      { str: 'Hello', hasEOL: false },
      { str: 'world.', hasEOL: true },
      { str: 'Next sentence!', hasEOL: false },
    ])

    expect(model.text).toBe('Hello world.\nNext sentence!')
    expect(model.characterSources[5]).toBeNull()
    expect(model.characterSources[6]).toEqual({ itemIndex: 1, offset: 0 })
    expect(model.words.map(word => word.text)).toEqual(['Hello', 'world', 'Next', 'sentence'])
    expect(model.sentences.map(sentence => sentence.text)).toEqual([
      'Hello world.',
      'Next sentence!',
    ])
  })

  it('locates the active word and sentence from a speech character index', () => {
    const model = buildPageTextModel([{ str: 'One two. Three four.', hasEOL: false }])

    expect(findWordIndex(model, model.text.indexOf('two'))).toBe(1)
    expect(findSentenceIndex(model, model.text.indexOf('Three'))).toBe(1)
  })
})
