import { LoaderCircleIcon } from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { cn } from '@/lib/utils'
import { ErrorState } from './error-state'
import { PageTextLayer } from './page-text-layer'
import { useDocument } from './state/document'
import { useViewport } from './state/viewport'

// A pinch changes the scale many times a second. The page is rendered again only once the scale
// has stayed the same for this long; until then the last render is stretched to the new size.
const RESCALE_DELAY = 150

type Size = { width: number; height: number }

type RenderResult = {
  pdf: PDFDocumentProxy
  pageNumber: number
  scale: number
  // The page size in CSS pixels at scale 1, or null when the page could not be rendered.
  pageSize: Size | null
}

// Safari limits the total canvas memory, so a canvas is emptied as soon as it is not needed
// instead of waiting for garbage collection.
function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0
  canvas.height = 0
}

export function PdfPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { pdf } = useDocument()
  const { pageRef, pageNumber, scale } = useViewport()
  const [result, setResult] = useState<RenderResult | null>(null)

  // The canvas shows this page, possibly rendered at another scale.
  const isShowingPage =
    result !== null &&
    result.pdf === pdf &&
    result.pageNumber === pageNumber &&
    result.pageSize !== null
  const isRescale = useEffectEvent(() => isShowingPage)

  useEffect(() => {
    const canvas = canvasRef.current
    if (pdf === null || canvas === null) {
      return
    }

    let isActive = true
    let renderTask: RenderTask | null = null
    let buffer: HTMLCanvasElement | null = null
    const isZoom = isRescale()

    // A zoom keeps the stretched page on screen, another page starts blank.
    if (!isZoom) {
      releaseCanvas(canvas)
    }

    function finish(pageSize: Size | null) {
      if (isActive && pdf !== null) {
        setResult({ pdf, pageNumber, scale, pageSize })
      }
    }

    const timer = window.setTimeout(
      () => {
        pdf
          .getPage(pageNumber)
          .then(page => {
            if (!isActive) {
              return
            }

            const context = canvas.getContext('2d')
            if (context === null) {
              throw new Error('Canvas is not supported')
            }

            const viewport = page.getViewport({ scale })
            const outputScale = window.devicePixelRatio || 1
            // Renders off screen, so the canvas keeps the previous render until this one is done.
            const target = document.createElement('canvas')
            buffer = target
            target.width = Math.floor(viewport.width * outputScale)
            target.height = Math.floor(viewport.height * outputScale)

            renderTask = page.render({
              canvas: target,
              transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
              viewport,
            })

            return renderTask.promise.then(() => {
              if (!isActive) {
                return
              }

              canvas.width = target.width
              canvas.height = target.height
              context.drawImage(target, 0, 0)
              releaseCanvas(target)
              const { width, height } = page.getViewport({ scale: 1 })
              // The CSS size is committed in the same task as the bitmap, so a new page is never
              // painted at the size of the previous one.
              flushSync(() => finish({ width, height }))
            })
          })
          .catch((renderError: unknown) => {
            if (
              !(renderError instanceof Error && renderError.name === 'RenderingCancelledException')
            ) {
              finish(null)
            }
          })
      },
      isZoom ? RESCALE_DELAY : 0,
    )

    return () => {
      isActive = false
      window.clearTimeout(timer)
      renderTask?.cancel()
      if (buffer !== null) {
        releaseCanvas(buffer)
      }
    }
  }, [pdf, pageNumber, scale])

  // Loading is derived: the page is busy until a render for the current inputs has finished.
  const isCurrent =
    result !== null &&
    result.pdf === pdf &&
    result.pageNumber === pageNumber &&
    result.scale === scale

  if (isCurrent && result.pageSize === null) {
    return <ErrorState message="This page could not be rendered." />
  }

  // The size follows the scale at once, so zooming responds before the new render is ready.
  // While another page renders, the canvas keeps the size of the previous one.
  const pageSize = result?.pageSize ?? null

  return (
    <div
      ref={pageRef}
      className={cn('canvas-wrap', pageSize === null && 'is-placeholder')}
      aria-busy={!isCurrent}
    >
      <canvas
        ref={canvasRef}
        className="pdf-canvas"
        aria-label={`Page ${pageNumber}`}
        style={
          pageSize === null
            ? undefined
            : {
                width: Math.floor(pageSize.width * scale),
                height: Math.floor(pageSize.height * scale),
              }
        }
      />
      <PageTextLayer isCanvasRendered={isCurrent} />
      {!isShowingPage && (
        <div className="page-loading" role="status">
          <LoaderCircleIcon />
          <span>{pdf === null ? 'Opening document' : 'Rendering page'}</span>
        </div>
      )}
    </div>
  )
}
