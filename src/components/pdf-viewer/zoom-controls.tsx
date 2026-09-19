import { useHotkey } from '@tanstack/react-hotkeys'
import { Maximize2Icon, MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useViewport } from './state/viewport'

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function ZoomControls() {
  const { scale, canZoomIn, canZoomOut, zoomIn, zoomOut, fitToWidth } = useViewport()

  useHotkey('=', zoomIn)
  // `+` cannot be written as a hotkey string because `+` separates keys, so match Shift + `=`.
  useHotkey({ key: '=', shift: true }, zoomIn)
  useHotkey('-', zoomOut)

  return (
    <fieldset className="zoom-controls">
      <legend className="sr-only">Zoom controls</legend>
      <Button
        aria-label="Zoom out"
        disabled={!canZoomOut}
        onClick={zoomOut}
        size="icon-sm"
        variant="ghost"
      >
        <MinusIcon />
      </Button>
      <span className="zoom-value">{toPercent(scale)}</span>
      <Button
        aria-label="Zoom in"
        disabled={!canZoomIn}
        onClick={zoomIn}
        size="icon-sm"
        variant="ghost"
      >
        <PlusIcon />
      </Button>
      <Button
        aria-label="Fit page to width"
        onClick={fitToWidth}
        size="icon-sm"
        title="Fit to width"
        variant="ghost"
      >
        <Maximize2Icon />
      </Button>
    </fieldset>
  )
}
