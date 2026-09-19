import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useMemo, useRef, useState } from 'react'
import { createStrictContext } from './create-strict-context'

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25
const STAGE_PADDING = 96
const MIN_FIT_WIDTH = 320

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampScale(value: number) {
  return clamp(value, MIN_SCALE, MAX_SCALE)
}

export function useViewportState(pdf: PDFDocumentProxy | null) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ pdf, pageNumber: 1 })

  // The page number belongs to the document it was chosen in, so a new document starts on page 1.
  const pageNumber = position.pdf === pdf ? position.pageNumber : 1
  const pageCount = pdf?.numPages ?? 0

  return useMemo(
    () => ({
      stageRef,
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
        setScale(current => clampScale(current + SCALE_STEP))
      },
      zoomOut() {
        setScale(current => clampScale(current - SCALE_STEP))
      },
      async fitToWidth() {
        const stage = stageRef.current
        if (pdf === null || stage === null) {
          return
        }

        const page = await pdf.getPage(pageNumber)
        const { width } = page.getViewport({ scale: 1 })
        const availableWidth = Math.max(MIN_FIT_WIDTH, stage.clientWidth - STAGE_PADDING)
        setScale(clampScale(availableWidth / width))
      },
    }),
    [pdf, pageNumber, pageCount, scale],
  )
}

export const [ViewportContext, useViewport] =
  createStrictContext<ReturnType<typeof useViewportState>>('useViewport')
