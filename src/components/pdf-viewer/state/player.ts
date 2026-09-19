import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { readAloud } from '@/core/speech'
import {
  findFirstWordOfSentence,
  findSentenceIndexOfWord,
  type PageTextModel,
} from '@/core/text-model'
import { createStrictContext } from './create-strict-context'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

type Speed = (typeof SPEEDS)[number]

type WordPosition = {
  pdf: PDFDocumentProxy
  pageNumber: number
  wordIndex: number
}

type PlayerInput = {
  pdf: PDFDocumentProxy | null
  pageNumber: number
  pageCount: number
  goToPage: (pageNumber: number) => void
  model: PageTextModel | null
}

const synthesis = typeof window !== 'undefined' ? (window.speechSynthesis ?? null) : null

export function usePlayerState({ pdf, pageNumber, pageCount, goToPage, model }: PlayerInput) {
  // The active word.
  const [cursor, setCursor] = useState<WordPosition | null>(null)
  // Where reading started, present while playing. Every seek replaces it, which restarts speech.
  // On any other page of the same document, reading starts from the top of the page.
  const [session, setSession] = useState<WordPosition | null>(null)
  const [speed, setSpeed] = useState<Speed>(1)
  const [isTimerSync, setIsTimerSync] = useState(false)

  // The cursor belongs to the page it was set on, so another page starts with no active word.
  const wordIndex =
    cursor !== null && cursor.pdf === pdf && cursor.pageNumber === pageNumber
      ? cursor.wordIndex
      : null
  const readingSession = session !== null && session.pdf === pdf ? session : null
  const isPlaying = readingSession !== null
  const wordCount = model?.words.length ?? 0

  const handlePageEnd = useEffectEvent(() => {
    setCursor(null)
    if (pdf !== null && pageNumber < pageCount) {
      goToPage(pageNumber + 1)
      setSession({ pdf, pageNumber: pageNumber + 1, wordIndex: 0 })
    } else {
      setSession(null)
    }
  })

  useEffect(() => {
    if (readingSession === null || model === null || synthesis === null) {
      return
    }

    const { pdf: sessionPdf } = readingSession
    const fromWord = readingSession.pageNumber === pageNumber ? readingSession.wordIndex : 0

    return readAloud(synthesis, {
      model,
      fromWord,
      rate: speed,
      onWord: index => setCursor({ pdf: sessionPdf, pageNumber, wordIndex: index }),
      onTimerSync: () => setIsTimerSync(true),
      onEnd: () => handlePageEnd(),
      onError: () => setSession(null),
    })
  }, [readingSession, pageNumber, model, speed])

  return useMemo(() => {
    const sentenceIndex =
      model === null || wordIndex === null ? null : findSentenceIndexOfWord(model, wordIndex)

    function seek(nextWord: number | null, options: { play?: boolean } = {}) {
      if (pdf === null || nextWord === null || wordCount === 0) {
        return
      }

      const next = { pdf, pageNumber, wordIndex: Math.min(Math.max(nextWord, 0), wordCount - 1) }
      setCursor(next)
      if (isPlaying || (options.play === true && synthesis !== null)) {
        setSession(next)
      }
    }

    function seekSentence(nextSentence: number) {
      if (model !== null) {
        seek(findFirstWordOfSentence(model, Math.max(nextSentence, 0)))
      }
    }

    return {
      isSupported: synthesis !== null,
      isPlaying,
      isTimerSync,
      speed,
      wordIndex,
      sentenceIndex,
      hasText: wordCount > 0,
      seek,
      togglePlayback() {
        if (isPlaying) {
          setSession(null)
        } else {
          seek(wordIndex ?? 0, { play: true })
        }
      },
      stop() {
        setSession(null)
        setCursor(null)
      },
      previousSentence() {
        seekSentence(sentenceIndex === null ? 0 : sentenceIndex - 1)
      },
      nextSentence() {
        seekSentence(sentenceIndex === null ? 0 : sentenceIndex + 1)
      },
      cycleSpeed() {
        setSpeed(current => SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length] ?? 1)
        // Speech cannot change rate mid-utterance, so reading restarts from the active word.
        if (isPlaying) {
          seek(wordIndex ?? 0)
        }
      },
    }
  }, [pdf, pageNumber, model, wordIndex, wordCount, isPlaying, isTimerSync, speed])
}

export const [PlayerContext, usePlayer] =
  createStrictContext<ReturnType<typeof usePlayerState>>('usePlayer')
