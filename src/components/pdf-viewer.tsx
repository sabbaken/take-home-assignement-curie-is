import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  FileUp,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react'
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const MIN_SCALE = 0.6
const MAX_SCALE = 1.8
const SCALE_STEP = 0.2
const DEFAULT_PDF_URL = `${import.meta.env.BASE_URL}sample.pdf`

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function PdfViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const uploadedUrlRef = useRef<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState(DEFAULT_PDF_URL)
  const [fileName, setFileName] = useState('sample.pdf')
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1)
  const [isLoadingDocument, setIsLoadingDocument] = useState(true)
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadingTask = getDocument({ url: documentUrl })
    let isActive = true

    loadingTask.promise
      .then(loadedPdf => {
        if (isActive) {
          setIsRendering(true)
          setPdf(loadedPdf)
          setIsLoadingDocument(false)
        }
      })
      .catch(() => {
        if (isActive) {
          setError('The PDF could not be opened. Try another file.')
          setIsLoadingDocument(false)
        }
      })

    return () => {
      isActive = false
      void loadingTask.destroy()
    }
  }, [documentUrl])

  useEffect(() => {
    if (pdf === null || canvasRef.current === null) {
      return
    }

    let isActive = true
    let renderTask: RenderTask | null = null

    void pdf
      .getPage(pageNumber)
      .then(page => {
        if (!isActive || canvasRef.current === null) {
          return
        }

        const canvas = canvasRef.current
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
      .then(() => {
        if (isActive) {
          setIsRendering(false)
        }
      })
      .catch(renderError => {
        if (
          isActive &&
          renderError instanceof Error &&
          renderError.name !== 'RenderingCancelledException'
        ) {
          setError('This page could not be rendered.')
          setIsRendering(false)
        }
      })

    return () => {
      isActive = false
      renderTask?.cancel()
    }
  }, [pageNumber, pdf, scale])

  useEffect(
    () => () => {
      if (uploadedUrlRef.current !== null) {
        URL.revokeObjectURL(uploadedUrlRef.current)
      }
    },
    [],
  )

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (file === undefined) {
      return
    }

    if (uploadedUrlRef.current !== null) {
      URL.revokeObjectURL(uploadedUrlRef.current)
    }

    const nextUrl = URL.createObjectURL(file)
    uploadedUrlRef.current = nextUrl
    setError(null)
    setPdf(null)
    setPageNumber(1)
    setIsLoadingDocument(true)
    setFileName(file.name)
    setDocumentUrl(nextUrl)
    event.target.value = ''
  }

  function restoreSample() {
    if (uploadedUrlRef.current !== null) {
      URL.revokeObjectURL(uploadedUrlRef.current)
      uploadedUrlRef.current = null
    }

    setFileName('sample.pdf')
    setError(null)
    setPdf(null)
    setPageNumber(1)
    setIsLoadingDocument(true)
    setDocumentUrl(`${DEFAULT_PDF_URL}?retry=${Date.now()}`)
  }

  const pageCount = pdf?.numPages ?? 0

  return (
    <section className="viewer-shell" aria-label="PDF viewer">
      <header className="viewer-toolbar">
        <div className="toolbar-brand">
          <span className="brand-mark" aria-hidden="true">
            <AudioLines />
          </span>
          <div className="file-meta">
            <p className="truncate text-sm font-semibold text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {pageCount > 0
                ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`
                : 'Opening document'}
            </p>
          </div>
        </div>

        <fieldset className="page-navigation">
          <legend className="sr-only">Page navigation</legend>
          <Button
            aria-label="Previous page"
            disabled={pageNumber <= 1 || pdf === null}
            onClick={() => {
              setIsRendering(true)
              setPageNumber(current => current - 1)
            }}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-16 text-center text-sm tabular-nums">
            {pageCount > 0 ? `${pageNumber} / ${pageCount}` : '– / –'}
          </span>
          <Button
            aria-label="Next page"
            disabled={pdf === null || pageNumber >= pageCount}
            onClick={() => {
              setIsRendering(true)
              setPageNumber(current => current + 1)
            }}
            size="icon"
            variant="ghost"
          >
            <ChevronRight />
          </Button>
        </fieldset>

        <fieldset className="toolbar-actions">
          <legend className="sr-only">Document controls</legend>
          <div className="control-group">
            <Button
              aria-label="Zoom out"
              disabled={scale <= MIN_SCALE}
              onClick={() => {
                setIsRendering(true)
                setScale(current => Math.max(MIN_SCALE, current - SCALE_STEP))
              }}
              size="icon"
              variant="ghost"
            >
              <Minus />
            </Button>
            <span className="min-w-12 text-center text-sm tabular-nums">{toPercent(scale)}</span>
            <Button
              aria-label="Zoom in"
              disabled={scale >= MAX_SCALE}
              onClick={() => {
                setIsRendering(true)
                setScale(current => Math.min(MAX_SCALE, current + SCALE_STEP))
              }}
              size="icon"
              variant="ghost"
            >
              <Plus />
            </Button>
          </div>

          {fileName !== 'sample.pdf' && (
            <Button
              aria-label="Restore sample PDF"
              onClick={restoreSample}
              size="icon"
              variant="ghost"
            >
              <RotateCcw />
            </Button>
          )}

          <Button asChild className="open-pdf-button" size="sm">
            <label htmlFor="pdf-upload">
              <FileUp />
              <span className="open-label">Open PDF</span>
            </label>
          </Button>
          <input
            id="pdf-upload"
            className="sr-only"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
          />
        </fieldset>
      </header>

      <div className="document-stage">
        {error !== null ? (
          <div className="empty-state" role="alert">
            <p className="font-semibold text-foreground">Document unavailable</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{error}</p>
            <Button className="mt-5" onClick={restoreSample} size="sm">
              Open sample PDF
            </Button>
          </div>
        ) : (
          <div className="canvas-wrap" aria-busy={isLoadingDocument || isRendering}>
            {(isLoadingDocument || isRendering) && (
              <div className="loading-indicator" role="status">
                <LoaderCircle className="size-4 animate-spin" />
                {isLoadingDocument ? 'Opening PDF' : 'Rendering page'}
              </div>
            )}
            <canvas ref={canvasRef} className="pdf-canvas" aria-label={`Page ${pageNumber}`} />
          </div>
        )}
      </div>
    </section>
  )
}
