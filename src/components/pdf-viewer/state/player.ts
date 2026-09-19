import { useMemo, useState } from 'react'
import { createStrictContext } from './create-strict-context'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

type Speed = (typeof SPEEDS)[number]

export function usePlayerState() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(1)

  return useMemo(
    () => ({
      isPlaying,
      speed,
      togglePlayback() {
        setIsPlaying(current => !current)
      },
      stop() {
        setIsPlaying(false)
      },
      cycleSpeed() {
        setSpeed(current => SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length] ?? 1)
      },
    }),
    [isPlaying, speed],
  )
}

export const [PlayerContext, usePlayer] =
  createStrictContext<ReturnType<typeof usePlayerState>>('usePlayer')
