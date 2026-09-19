import { LoaderCircleIcon } from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { ErrorState } from './error-state'
import { PageTextLayer } from './page-text-layer'
import { useDocument } from './state/document'
import { useViewport } from './state/viewport'

type RenderResult = {
  pdf: PDFDocumentProxy
  pageNumber: number
  scale: number
  error: string | null
}

export function PdfPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { pdf } = useDocument()
  const { pageNumber, scale } = useViewport()
  const [result, setResult] = useState<RenderResult | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (pdf === null || canvas === null) {
      return
    }

    let isActive = true
    let renderTask: RenderTask | null = null

    function finish(error: string | null) {
      if (isActive && pdf !== null) {
        setResult({ pdf, pageNumber, scale, error })
      }
    }

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

        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        renderTask = page.render({
          canvas,
          canvasContext: context,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          viewport,
        })

        return renderTask.promise
      })
      .then(
        () => finish(null),
        (renderError: unknown) => {
          if (
            !(renderError instanceof Error && renderError.name === 'RenderingCancelledException')
          ) {
            finish('This page could not be rendered.')
          }
        },
      )

    return () => {
      isActive = false
      renderTask?.cancel()
    }
  }, [pdf, pageNumber, scale])

  // Loading is derived: the page is busy until a render for the current inputs has finished.
  const isCurrent =
    result !== null &&
    result.pdf === pdf &&
    result.pageNumber === pageNumber &&
    result.scale === scale

  if (isCurrent && result.error !== null) {
    return <ErrorState message={result.error} />
  }

  const isBusy = !isCurrent

  return (
    <div className="canvas-wrap" aria-busy={isBusy}>
      <canvas ref={canvasRef} className="pdf-canvas" aria-label={`Page ${pageNumber}`} />
      <PageTextLayer isCanvasRendered={isCurrent} />
      {isBusy && (
        <div className="page-loading" role="status">
          <LoaderCircleIcon />
          <span>{pdf === null ? 'Opening document' : 'Rendering page'}</span>
        </div>
      )}
    </div>
  )
}
