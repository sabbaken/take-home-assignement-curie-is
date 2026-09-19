import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readAloud } from '@/core/speech'
import { buildPageTextModel } from '@/core/text-model'

// jsdom has no speech synthesis, so the test drives the utterance events by hand.
class FakeUtterance {
  rate = 1
  onstart: (() => void) | null = null
  onboundary: ((event: { name: string; charIndex: number }) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null

  constructor(readonly text: string) {}
}

function createSynthesis() {
  const spoken: FakeUtterance[] = []
  const synthesis = {
    speak: vi.fn((utterance: FakeUtterance) => spoken.push(utterance)),
    cancel: vi.fn(),
  }
  return { spoken, synthesis: synthesis as unknown as SpeechSynthesis }
}

function lastOf(spoken: FakeUtterance[]) {
  const utterance = spoken.at(-1)
  if (utterance === undefined) {
    throw new Error('Nothing was spoken')
  }
  return utterance
}

const model = buildPageTextModel([{ str: 'One two three. Four five.', hasEOL: false }])

function createCallbacks() {
  return { onWord: vi.fn(), onTimerSync: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
}

describe('readAloud', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reads sentence by sentence from the start word and follows boundary events', () => {
    const { spoken, synthesis } = createSynthesis()
    const callbacks = createCallbacks()
    readAloud(synthesis, { model, fromWord: 1, rate: 1.5, ...callbacks })
    vi.runOnlyPendingTimers()

    const first = lastOf(spoken)
    expect(first.text).toBe('two three.')
    expect(first.rate).toBe(1.5)

    first.onstart?.()
    first.onboundary?.({ name: 'word', charIndex: 0 })
    first.onboundary?.({ name: 'word', charIndex: 4 })
    expect(callbacks.onWord.mock.calls.map(([index]) => index)).toEqual([1, 1, 2])

    first.onend?.()
    const second = lastOf(spoken)
    expect(second.text).toBe('Four five.')

    second.onend?.()
    expect(callbacks.onEnd).toHaveBeenCalledOnce()
    expect(callbacks.onTimerSync).not.toHaveBeenCalled()
  })

  it('advances words on a timer when the voice sends no boundary events', () => {
    const { spoken, synthesis } = createSynthesis()
    const callbacks = createCallbacks()
    readAloud(synthesis, { model, fromWord: 0, rate: 1, ...callbacks })
    vi.runOnlyPendingTimers()

    lastOf(spoken).onstart?.()
    vi.advanceTimersByTime(2000)

    expect(callbacks.onTimerSync).toHaveBeenCalledOnce()
    expect(callbacks.onWord.mock.calls.map(([index]) => index)).toEqual([0, 1, 2])
  })

  it('reports an error that interrupts reading from outside', () => {
    const { spoken, synthesis } = createSynthesis()
    const callbacks = createCallbacks()
    readAloud(synthesis, { model, fromWord: 0, rate: 1, ...callbacks })
    vi.runOnlyPendingTimers()

    lastOf(spoken).onerror?.({ error: 'interrupted' })

    expect(callbacks.onError).toHaveBeenCalledWith('interrupted')
  })

  it('ignores events after it has been stopped', () => {
    const { spoken, synthesis } = createSynthesis()
    const callbacks = createCallbacks()
    const stopReading = readAloud(synthesis, { model, fromWord: 0, rate: 1, ...callbacks })
    vi.runOnlyPendingTimers()

    const utterance = lastOf(spoken)
    stopReading()
    utterance.onerror?.({ error: 'interrupted' })
    utterance.onend?.()

    expect(synthesis.cancel).toHaveBeenCalledOnce()
    expect(spoken).toHaveLength(1)
    expect(callbacks.onEnd).not.toHaveBeenCalled()
    expect(callbacks.onError).not.toHaveBeenCalled()
  })
})
