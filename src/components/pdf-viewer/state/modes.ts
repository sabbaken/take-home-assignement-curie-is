import { useMemo, useState } from 'react'
import { createStrictContext } from './create-strict-context'

export type RectMode = 'naive' | 'precise'

export function useModesState() {
  const [rectMode, setRectMode] = useState<RectMode>('precise')
  const [isDebug, setIsDebug] = useState(false)

  return useMemo(
    () => ({
      rectMode,
      isDebug,
      setRectMode,
      toggleRectMode() {
        setRectMode(current => (current === 'naive' ? 'precise' : 'naive'))
      },
      toggleDebug() {
        setIsDebug(current => !current)
      },
    }),
    [rectMode, isDebug],
  )
}

export const [ModesContext, useModes] =
  createStrictContext<ReturnType<typeof useModesState>>('useModes')
