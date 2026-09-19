import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createStrictContext } from './create-strict-context'

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25
const MIN_FIT_WIDTH = 320

type Point = { x: number; y: number }

// A point on the page, in fractions of the page size, and the client position it has to keep
// after the zoom.
type ZoomAnchor = { client: Point; page: Point }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampScale(value: number) {
  return clamp(value, MIN_SCALE, MAX_SCALE)
}

// Moves to the next multiple of the step, so the buttons return to round values after a pinch.
function stepScale(current: number, direction: 1 | -1) {
  const steps = current / SCALE_STEP
  const next = direction === 1 ? Math.floor(steps + 1e-6) + 1 : Math.ceil(steps - 1e-6) - 1
  return clampScale(next * SCALE_STEP)
}

export function useViewportState(pdf: PDFDocumentProxy | null) {
  const stageRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<ZoomAnchor | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ pdf, pageNumber: 1 })

  // The page number belongs to the document it was chosen in, so a new document starts on page 1.
  const pageNumber = position.pdf === pdf ? position.pageNumber : 1
  const pageCount = pdf?.numPages ?? 0

  // The page takes its size for the new scale during the commit, so before the browser paints,
  // the stage scrolls to put the anchored point of the page back where it was on screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the anchor applies to a scale change
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const stage = stageRef.current
    const page = pageRef.current
    anchorRef.current = null
    if (anchor === null || stage === null || page === null) {
      return
    }

    const bounds = page.getBoundingClientRect()
    stage.scrollLeft += bounds.left + anchor.page.x * bounds.width - anchor.client.x
    stage.scrollTop += bounds.top + anchor.page.y * bounds.height - anchor.client.y
  }, [scale])

  return useMemo(() => {
    // Zooms around a client point, the middle of the stage by default. The anchor is read from
    // the DOM as it is on screen now, so it stays valid when several zooms land in one commit.
    function zoom(getScale: (current: number) => number, client?: Point) {
      const stage = stageRef.current
      const page = pageRef.current
      if (stage !== null && page !== null) {
        const stageBounds = stage.getBoundingClientRect()
        const point = client ?? {
          x: stageBounds.left + stageBounds.width / 2,
          y: stageBounds.top + stageBounds.height / 2,
        }
        const bounds = page.getBoundingClientRect()
        anchorRef.current = {
          client: point,
          page: {
            x: (point.x - bounds.left) / bounds.width,
            y: (point.y - bounds.top) / bounds.height,
          },
        }
      }
      setScale(current => clampScale(getScale(current)))
    }

    return {
      stageRef,
      pageRef,
      pageNumber,
      pageCount,
      scale,
      canZoomIn: scale < MAX_SCALE,
      canZoomOut: scale > MIN_SCALE,
      goToPage(nextPage: number) {
        if (pdf !== null) {
          setPosition({ pdf, pageNumber: clamp(nextPage, 1, pdf.numPages) })
        }
      },
      zoomIn() {
        zoom(current => stepScale(current, 1))
      },
      zoomOut() {
        zoom(current => stepScale(current, -1))
      },
      zoomBy(factor: number, client: Point) {
        zoom(current => current * factor, client)
      },
      async fitToWidth() {
        const stage = stageRef.current
        if (pdf === null || stage === null) {
          return
        }

        const page = await pdf.getPage(pageNumber)
        const { width } = page.getViewport({ scale: 1 })
        const { paddingLeft, paddingRight } = getComputedStyle(stage)
        const contentWidth =
          stage.clientWidth - Number.parseFloat(paddingLeft) - Number.parseFloat(paddingRight)
        const fitScale = Math.max(MIN_FIT_WIDTH, contentWidth) / width
        zoom(() => fitScale)
      },
    }
  }, [pdf, pageNumber, pageCount, scale])
}

export const [ViewportContext, useViewport] =
  createStrictContext<ReturnType<typeof useViewportState>>('useViewport')
