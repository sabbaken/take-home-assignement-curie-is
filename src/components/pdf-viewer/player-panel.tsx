import { useHotkey } from '@tanstack/react-hotkeys'
import {
  GaugeIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SquareIcon,
  StepBackIcon,
  StepForwardIcon,
  TimerIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageText } from './state/page-text'
import { usePlayer } from './state/player'

export function PlayerPanel() {
  const { model } = usePageText()
  const {
    isSupported,
    isPlaying,
    isTimerSync,
    speed,
    sentenceIndex,
    sentenceCount,
    hasText,
    togglePlayback,
    stop,
    previousWord,
    nextWord,
    previousSentence,
    nextSentence,
    cycleSpeed,
  } = usePlayer()

  useHotkey('Space', togglePlayback)
  useHotkey('Escape', stop)
  useHotkey('ArrowLeft', previousWord)
  useHotkey('ArrowRight', nextWord)
  useHotkey('Shift+ArrowLeft', previousSentence)
  useHotkey('Shift+ArrowRight', nextSentence)

  function getPlayTitle() {
    if (!isSupported) {
      return 'Speech is not supported in this browser'
    }
    return isPlaying ? 'Pause (Space)' : 'Play (Space)'
  }

  return (
    <div className="floating-panel player-panel">
      <div className="player-actions">
        <Button
          aria-label="Previous sentence"
          disabled={!hasText}
          onClick={previousSentence}
          size="icon"
          title="Previous sentence (Shift + ←)"
          variant="ghost"
        >
          <SkipBackIcon />
        </Button>
        <Button
          aria-label="Previous word"
          disabled={!hasText}
          onClick={previousWord}
          size="icon"
          title="Previous word (←)"
          variant="ghost"
        >
          <StepBackIcon />
        </Button>
        <Button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="play-button"
          disabled={!hasText || !isSupported}
          onClick={togglePlayback}
          size="icon-lg"
          title={getPlayTitle()}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon className="play-icon" />}
        </Button>
        <Button
          aria-label="Next word"
          disabled={!hasText}
          onClick={nextWord}
          size="icon"
          title="Next word (→)"
          variant="ghost"
        >
          <StepForwardIcon />
        </Button>
        <Button
          aria-label="Next sentence"
          disabled={!hasText}
          onClick={nextSentence}
          size="icon"
          title="Next sentence (Shift + →)"
          variant="ghost"
        >
          <SkipForwardIcon />
        </Button>
        <Button
          aria-label="Stop and return to the beginning"
          onClick={stop}
          size="icon"
          title="Stop (Esc)"
          variant="ghost"
        >
          <SquareIcon />
        </Button>
      </div>
      <span className="player-divider" aria-hidden="true" />
      <button
        className="speed-control"
        onClick={cycleSpeed}
        type="button"
        title="Change reading speed"
      >
        <GaugeIcon />
        {speed}×
      </button>
      <span className="player-divider" aria-hidden="true" />
      {model !== null && !hasText ? (
        <span className="sentence-progress">No text to read on this page</span>
      ) : (
        <span className="sentence-progress">
          Sentence <strong>{sentenceIndex === null ? '—' : sentenceIndex + 1}</strong> of{' '}
          <strong>{sentenceCount || '—'}</strong>
        </span>
      )}
      {isTimerSync && (
        <span
          className="timer-sync"
          title="This voice reports no word boundaries, so word timing is estimated"
        >
          <TimerIcon />
          <span className="sr-only">Timer-based synchronization fallback</span>
        </span>
      )}
    </div>
  )
}
