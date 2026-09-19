import { findSentenceIndex, findWordIndex, type PageTextModel } from '@/core/text-model'

// Rough speaking pace at rate 1, used only when the voice sends no word boundary events.
const CHARACTERS_PER_SECOND = 14
const CLAUSE_PAUSE_SECONDS = 0.25

export type ReadAloudOptions = {
  model: PageTextModel
  fromWord: number
  rate: number
  onWord: (wordIndex: number) => void
  // The voice sends no boundary events, so the active word is advanced on an estimated timer.
  onTimerSync: () => void
  // The last sentence of the page has been read.
  onEnd: () => void
  onError: (error: string) => void
}

export function estimateSpeechSeconds(text: string, rate: number) {
  const pauses = text.match(/[,;:]/gu)?.length ?? 0
  return (text.length / CHARACTERS_PER_SECOND + pauses * CLAUSE_PAUSE_SECONDS) / rate
}

// Safari on iOS ignores `speak()` until one call happens inside a user gesture, and `readAloud`
// runs later, from an effect. Call this from the click or key handler that starts reading. The
// empty utterance is silent and ends at once, and the first sentence queues behind it. It is not
// cancelled, because Chrome can drop an utterance spoken shortly after `cancel()`.
export function unlockSpeech(synthesis: SpeechSynthesis) {
  synthesis.speak(new SpeechSynthesisUtterance(''))
}

// Reads the page one sentence per utterance, starting at `fromWord`, and reports the active word
// from `boundary` events. Returns a function that stops reading.
export function readAloud(synthesis: SpeechSynthesis, options: ReadAloudOptions) {
  const { model, fromWord, rate, onWord, onTimerSync, onEnd, onError } = options
  let isActive = true
  let hasBoundaryEvents = false
  let isTimerSync = false
  let wordTimers: number[] = []
  // Chrome can garbage-collect an utterance that nothing references and then drop its events.
  let utterance: SpeechSynthesisUtterance | null = null

  function clearWordTimers() {
    for (const timer of wordTimers) {
      window.clearTimeout(timer)
    }
    wordTimers = []
  }

  function scheduleWords(firstWord: number, end: number) {
    let elapsed = 0

    for (let index = firstWord + 1; index < model.words.length; index += 1) {
      const previous = model.words[index - 1]
      const word = model.words[index]
      if (previous === undefined || word === undefined || word.start >= end) {
        break
      }

      elapsed += estimateSpeechSeconds(model.text.slice(previous.start, word.start), rate)
      const timer = window.setTimeout(() => {
        if (!isTimerSync) {
          isTimerSync = true
          onTimerSync()
        }
        onWord(index)
      }, elapsed * 1000)
      wordTimers.push(timer)
    }
  }

  function speakFrom(wordIndex: number) {
    const word = model.words[wordIndex]
    const sentence =
      word === undefined ? undefined : model.sentences[findSentenceIndex(model, word.start)]
    if (word === undefined || sentence === undefined) {
      onEnd()
      return
    }

    const start = word.start
    const next = new SpeechSynthesisUtterance(model.text.slice(start, sentence.end))
    next.rate = rate

    next.onstart = () => {
      if (!isActive) {
        return
      }
      onWord(wordIndex)
      if (!hasBoundaryEvents) {
        scheduleWords(wordIndex, sentence.end)
      }
    }
    next.onboundary = event => {
      if (!isActive || event.name !== 'word') {
        return
      }
      if (!hasBoundaryEvents) {
        hasBoundaryEvents = true
        clearWordTimers()
      }
      onWord(findWordIndex(model, start + event.charIndex))
    }
    next.onend = () => {
      if (!isActive) {
        return
      }
      clearWordTimers()
      const nextWord = model.words.findIndex(candidate => candidate.start >= sentence.end)
      if (nextWord >= 0) {
        speakFrom(nextWord)
      } else {
        onEnd()
      }
    }
    next.onerror = event => {
      // Our own `cancel()` reports the dropped utterance as `interrupted`, but it only runs after
      // `isActive` is cleared. While active, even `interrupted` means reading stopped elsewhere.
      if (!isActive) {
        return
      }
      clearWordTimers()
      onError(event.error)
    }

    utterance = next
    synthesis.speak(next)
  }

  // Deferred, so a StrictMode remount or a quick restart cancels it before anything is spoken.
  const startTimer = window.setTimeout(() => speakFrom(fromWord), 0)

  return () => {
    isActive = false
    window.clearTimeout(startTimer)
    clearWordTimers()
    if (utterance !== null) {
      synthesis.cancel()
    }
  }
}
