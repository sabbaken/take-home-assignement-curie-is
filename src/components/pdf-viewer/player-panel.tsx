import { useHotkey } from '@tanstack/react-hotkeys'
import {
  GaugeIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  TimerIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayer } from './state/player'

export function PlayerPanel() {
  const {
    isSupported,
    isPlaying,
    isTimerSync,
    speed,
    hasText,
    togglePlayback,
    stop,
    previousSentence,
    nextSentence,
    cycleSpeed,
  } = usePlayer()

  useHotkey('Space', togglePlayback)
  useHotkey('Escape', stop)
  useHotkey('ArrowLeft', previousSentence)
  useHotkey('ArrowRight', nextSentence)

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
          title="Previous sentence (←)"
          variant="ghost"
        >
          <SkipBackIcon />
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
          aria-label="Next sentence"
          disabled={!hasText}
          onClick={nextSentence}
          size="icon"
          title="Next sentence (→)"
          variant="ghost"
        >
          <SkipForwardIcon />
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
