import { useEffect, useEffectEvent } from 'react'
import { useViewport } from './state/viewport'

// Trackpad pinch deltas are a few pixels, a mouse wheel notch is about 100. Capping the delta keeps
// one Ctrl + wheel notch a moderate step.
const MAX_WHEEL_DELTA = 20
const WHEEL_ZOOM_SPEED = 0.01

// Safari's non-standard GestureEvent. `scale` is relative to the start of the gesture.
type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number }

// Zooms the document, not the browser page, on a trackpad pinch or Ctrl + wheel, anywhere in the
// viewer. The point under the fingers stays in place.
export function usePinchZoom() {
  const { zoomBy } = useViewport()
  const zoomAt = useEffectEvent((factor: number, x: number, y: number) => {
    zoomBy(factor, { x, y })
  })

  useEffect(() => {
    let gestureScale: number | null = null

    // Chrome and Firefox report a pinch as a wheel event with `ctrlKey` set.
    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey || gestureScale !== null) {
        return
      }

      event.preventDefault()
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
          ? Math.min(MAX_WHEEL_DELTA, Math.max(-MAX_WHEEL_DELTA, event.deltaY))
          : Math.sign(event.deltaY) * MAX_WHEEL_DELTA
      zoomAt(Math.exp(-delta * WHEEL_ZOOM_SPEED), event.clientX, event.clientY)
    }

    // Safari reports it as gesture events instead.
    function handleGestureStart(event: Event) {
      event.preventDefault()
      gestureScale = 1
    }

    function handleGestureChange(event: Event) {
      event.preventDefault()
      const { scale, clientX, clientY } = event as GestureEvent
      if (gestureScale !== null && scale > 0) {
        zoomAt(scale / gestureScale, clientX, clientY)
        gestureScale = scale
      }
    }

    function handleGestureEnd(event: Event) {
      event.preventDefault()
      gestureScale = null
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('gesturestart', handleGestureStart)
    window.addEventListener('gesturechange', handleGestureChange)
    window.addEventListener('gestureend', handleGestureEnd)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('gesturestart', handleGestureStart)
      window.removeEventListener('gesturechange', handleGestureChange)
      window.removeEventListener('gestureend', handleGestureEnd)
    }
  }, [])
}
