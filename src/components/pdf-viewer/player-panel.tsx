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
import { usePlayer } from './state/player'

export function PlayerPanel() {
  const { isPlaying, speed, togglePlayback, stop, cycleSpeed } = usePlayer()

  useHotkey('Space', togglePlayback)
  useHotkey('Escape', stop)

  return (
    <div className="floating-panel player-panel">
      <div className="player-actions">
        <Button
          aria-label="Previous sentence"
          size="icon"
          title="Previous sentence (Shift + ←)"
          variant="ghost"
        >
          <SkipBackIcon />
        </Button>
        <Button aria-label="Previous word" size="icon" title="Previous word (←)" variant="ghost">
          <StepBackIcon />
        </Button>
        <Button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="play-button"
          onClick={togglePlayback}
          size="icon-lg"
          title="Play or pause (Space)"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon className="play-icon" />}
        </Button>
        <Button aria-label="Next word" size="icon" title="Next word (→)" variant="ghost">
          <StepForwardIcon />
        </Button>
        <Button
          aria-label="Next sentence"
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
      <span className="sentence-progress">
        Sentence <strong>—</strong> of <strong>—</strong>
      </span>
      <span
        className="timer-sync"
        title="Word timing is estimated when the voice provides no boundary events"
      >
        <TimerIcon />
        <span className="sr-only">Timer-based synchronization fallback</span>
      </span>
    </div>
  )
}
