import { useEffect, useMemo, useRef } from 'react'
import { type PageLayout, type Rect, roundedRectsPath } from '@/core/rects'
import { useModes } from './state/modes'
import { usePlayer } from './state/player'

const SENTENCE_PADDING = 2
const SENTENCE_RADIUS = 6
const WORD_PADDING = 1.5
const WORD_RADIUS = 3

function getRects(rectsByIndex: Rect[][] | undefined, index: number | null) {
  return index === null ? [] : (rectsByIndex?.[index] ?? [])
}

export function HighlightOverlay({ layout }: { layout: PageLayout | null }) {
  const wordAnchorRef = useRef<SVGRectElement>(null)
  const { isDebug } = useModes()
  const { wordIndex, sentenceIndex } = usePlayer()

  const sentencePath = roundedRectsPath(
    getRects(layout?.sentences, sentenceIndex),
    SENTENCE_PADDING,
    SENTENCE_RADIUS,
  )
  const wordRects = getRects(layout?.words, wordIndex)
  const wordPath = roundedRectsPath(wordRects, WORD_PADDING, WORD_RADIUS)
  const wordAnchor = wordRects[0]

  const debugPath = useMemo(
    () => (isDebug && layout !== null ? roundedRectsPath(layout.words.flat(), 0, 1.5) : ''),
    [isDebug, layout],
  )

  // Keeps the active word in view, also after a zoom moves it. It scrolls to an unanimated anchor,
  // because the highlight itself is still at its old position while its transition runs.
  // `scroll-margin` on the anchor keeps the word clear of the floating panels.
  useEffect(() => {
    if (wordPath !== '') {
      wordAnchorRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [wordPath])

  if (layout === null) {
    return null
  }

  return (
    <svg className="highlight-layer" aria-hidden="true">
      {sentencePath !== '' && <path className="sentence-highlight" d={sentencePath} />}
      {wordPath !== '' && <path className="word-highlight" d={wordPath} />}
      {wordAnchor !== undefined && (
        <rect
          ref={wordAnchorRef}
          className="word-anchor"
          x={wordAnchor.x}
          y={wordAnchor.y}
          width={wordAnchor.width}
          height={wordAnchor.height}
        />
      )}
      {debugPath !== '' && <path className="debug-outline naive" d={debugPath} />}
    </svg>
  )
}
