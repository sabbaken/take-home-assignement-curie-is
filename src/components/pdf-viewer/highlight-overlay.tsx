import { useEffect, useMemo, useRef } from 'react'
import { type PageLayout, type Rect, roundedRectsPath } from '@/core/rects'
import { type RectMode, useModes } from './state/modes'
import { usePlayer } from './state/player'

const SENTENCE_PADDING = 2
const SENTENCE_RADIUS = 6
const WORD_PADDING = 1.5
const WORD_RADIUS = 3
const DEBUG_RADIUS = 1.5

function getRects(rectsByIndex: Rect[][] | undefined, index: number | null) {
  return index === null ? [] : (rectsByIndex?.[index] ?? [])
}

function getDebugPath(layout: PageLayout) {
  return roundedRectsPath(layout.words.flat(), 0, DEBUG_RADIUS)
}

// Highlights with the selected strategy. Debug mode outlines every word with both strategies.
export function HighlightOverlay({ layouts }: { layouts: Record<RectMode, PageLayout> | null }) {
  const wordAnchorRef = useRef<SVGRectElement>(null)
  const followedWordRef = useRef<number | null>(null)
  const { rectMode, isDebug } = useModes()
  const { wordIndex, sentenceIndex, isPlaying } = usePlayer()
  const layout = layouts?.[rectMode] ?? null

  const sentencePath = roundedRectsPath(
    getRects(layout?.sentences, sentenceIndex),
    SENTENCE_PADDING,
    SENTENCE_RADIUS,
  )
  const wordRects = getRects(layout?.words, wordIndex)
  const wordPath = roundedRectsPath(wordRects, WORD_PADDING, WORD_RADIUS)
  const wordAnchor = wordRects[0]

  const debugPaths = useMemo(
    () =>
      isDebug && layouts !== null
        ? { naive: getDebugPath(layouts.naive), precise: getDebugPath(layouts.precise) }
        : null,
    [isDebug, layouts],
  )

  // Keeps the active word in view. While reading, it also follows the word after a zoom moves it.
  // While paused, it scrolls only to a word the cursor moved to, so zooming into another part of
  // the page stays there. The cursor is cleared on every page change, which resets the tracking.
  // It scrolls to an unanimated anchor, because the highlight itself is still at its old position
  // while its transition runs. `scroll-margin` on the anchor keeps the word clear of the panels.
  useEffect(() => {
    if (wordIndex === null) {
      followedWordRef.current = null
    } else if (wordPath !== '' && (isPlaying || wordIndex !== followedWordRef.current)) {
      wordAnchorRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      followedWordRef.current = wordIndex
    }
  }, [wordPath, wordIndex, isPlaying])

  if (layout === null) {
    return null
  }

  return (
    <svg className={`highlight-layer ${rectMode}`} aria-hidden="true">
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
      {debugPaths !== null && (
        <>
          <path className="debug-outline naive" d={debugPaths.naive} />
          <path className="debug-outline precise" d={debugPaths.precise} />
        </>
      )}
    </svg>
  )
}
